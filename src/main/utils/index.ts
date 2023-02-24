import process from 'node:process';
import childProcess, { spawn } from 'node:child_process';
import path from 'node:path';

type ProcessElevated = boolean | undefined;

/** On POSIX (mac, linux), determine whether the process is being run by root user. */
const isRoot = (): ProcessElevated => process.getuid && process.getuid() === 0;

/**
 * Determine if the current process is elevated i.e. "root" or a sudoer user on
 * Mac and Linux and "Administrator" on Windows.
 *
 * On Windows:
 * This method will simply check if the process can execute the "fltmc" command
 * on Windows. fltmc command is available on every windows system since XP so
 * this should be pretty portable. We don't even need to support XP let alone
 * anything before that.
 * @see https://stackoverflow.com/a/28268802
 *
 * On Mac:
 * This method checks if the user is root or if the user belongs to the "staff" or
 * "admin" group.
 */
export const isElevated = (): ProcessElevated => {
  // If Windows
  if (process.platform === 'win32') {
    childProcess.exec('fltmc', (err) => {
      // For any error, return false. 99.99% of the times this is because the process
      // is not running as an elevated (Admin) user.
      if (err) {
        return false;
      }
    });

    return true;
  }

  // If Mac
  if (process.platform === 'darwin') {
    // If the user is "root", return true.
    if (isRoot()) {
      return true;
    }

    // If the user belongs to the "staff" or "admin" groups,
    // ID of the staff group is 20 and of the admin group is 80.
    const gid = process.getgid && process.getgid();
    if (gid && (gid === 20 || gid === 80)) {
      return true;
    }

    return false;
  }
};

/**
 * Execute a specified powershell script. When the script successfully finishes execution, the method will resolve
 * a Promise with void. If the script encounters any error, the method will reject the Promise with a new Error object
 * containing the error message.
 *
 * @param name Name of the PowerShell script to execute. This must not include the path until the `/src/scripts/` folder.
 * @param params An object of key value pairs. Each value will be passed as a parameter to the script.
 * @param encode Whether to base64 encode values of the parameters or not. Defaults to false.
 */
export const executePSScript = (
  name: string,
  params?: Record<string, string>,
  encode: boolean = false
): Promise<string | null> => {
  let output: string | null = null;

  return new Promise((resolve, reject) => {
    // Find the script.
    const PSScript = path.join(__dirname, `../../scripts/${name}`);

    // Prepare params.
    let passableParams: string[] = [];

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        passableParams.push(`-${key}`);
        passableParams.push(encode ? Buffer.from(value).toString('base64') : value);
      });
    }

    // Execute the script.
    const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', PSScript, ...passableParams]);

    // Cath errors if any.
    ps.on('error', (error) => {
      reject(new Error(`The powershell process could not be run: ${sanitizePSResult(error.message)}`));
    });
    ps.stderr.on('data', (error) => {
      console.log(error.toString());
      reject(new Error(`The powershell process could not be completed successfully: ${sanitizePSResult(error.toString())}`));
    });

    // Collect buffer's output.
    ps.stdout.on('data', (data) => {
      if (!output) {
        output = data.toString();
        return;
      }

      output += data.toString();
    });

    ps.on('exit', (code) => {
      // Must exit with code 0 to be considered sucessful.
      if (code !== 0) {
        reject(new Error(`The powershell process could not be completed successfully. It exited with code: ${code}`));
      }

      resolve(output);
    });
  });
};

/**
 * This method removes unwanted parts of the buffer output by the powershell script.
 * It will accept the entire buffer as a string and remove the following.
 * - Any exact sentences defined in the method.
 * - New line symbols e.g. \n
 * - Carriage return symbols e.g. \r
 * - Double and single quotes.
 * - Colon symbols e.g. :
 * - Trim the string
 */
export const sanitizePSResult = (result: string) => {
  let sanitized = '';

  const remobales = ['The following exception occurred while retrieving member "RefreshCache"'];

  remobales.forEach((remobale) => {
    sanitized += result.replace(remobale, '');
  });

  // Remove new lines.
  sanitized = sanitized.replaceAll('\n', '');

  // Remove carriages.
  sanitized = sanitized.replaceAll('\r', '');

  // Remove double quotes
  sanitized = sanitized.replaceAll('"', '');

  // Remove single quotes
  sanitized = sanitized.replaceAll("'", '');

  // Remove colons
  sanitized = sanitized.replaceAll(':', '');

  // Return the remaining
  return sanitized.trim();
};
