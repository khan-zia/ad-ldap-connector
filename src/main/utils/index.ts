import process from 'node:process';
import childProcess, { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * @param params An object of key value pairs. Each value will be passed as a parameter to the script. If a key is set to Null,
 *               it will be omitted.
 * @param encode Whether to base64 encode values of the parameters or not. Defaults to false.
 * @param detach Whether to run the script on a completely detached child process so that it continues running even if the main
 *               node process exits. Defaults to false.
 */
export const executePSScript = (
  name: string,
  params?: Record<string, string | null>,
  encode = false,
  detach = false
): Promise<string | null> => {
  let output: string | null = null;
  let errorOutput: string | null = null;

  return new Promise((resolve, reject) => {
    // Find the script.
    const PSScript = path.join(__dirname(import.meta.url), `../../scripts/${name}`);

    // Prepare params.
    const passableParams: string[] = [];

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          passableParams.push(`-${key}`);
          passableParams.push(encode ? Buffer.from(value).toString('base64') : value);
        }
      });
    }

    let ps;
    const scriptArgs = ['-ExecutionPolicy', 'Bypass', '-NonInteractive', '-File', PSScript, ...passableParams];

    if (detach) {
      ps = spawn('psrunner.cmd', scriptArgs, {
        cwd: path.join(__dirname(import.meta.url), `../../scripts`),
      });
    } else {
      ps = spawn('powershell.exe', scriptArgs);
    }

    // Cath errors if any.
    ps.on('error', (error) => {
      reject(new Error(`The powershell process could not be run: ${sanitizePSResult(error.message)}`));
    });

    ps.stderr.on('data', (error) => {
      if (!errorOutput) {
        errorOutput = error.toString();
        return;
      }

      errorOutput += error.toString();
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
      // Must exit with code 0 to be considered successful.
      if (code !== 0) {
        const err = errorOutput || output;
        reject(
          new Error(
            err
              ? sanitizePSResult(err)
              : `The powershell process could not be completed successfully. It exited with code: ${code}`
          )
        );
      }

      resolve(output);
    });
  });
};

/**
 * This method removes unwanted parts of the buffer output by the powershell script.
 * It will accept the entire buffer as a string and remove the following.
 * - Any exact sentences defined in the method.
 * - Full path of any powershell script which is usualy spit out by PS in case of an error.
 * - New line symbols e.g. \n
 * - Carriage return symbols e.g. \r
 * - Double and single quotes.
 * - Colon symbols e.g. :
 * - Trim the string
 */
export const sanitizePSResult = (result: string): string => {
  let sanitized = result;
  const removables = ['The following exception occurred while retrieving member RefreshCache'];

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

  removables.forEach((removable) => {
    sanitized = sanitized.replace(removable, '');
  });

  // Return the remaining
  return sanitized.trim();
};

/**
 * This method returns current timestamp in UTC that is exactly the same format as the
 * one used by Active Directory for object attributes such as "whenChanged".
 *
 * The format in question is "YYYYMMDDHHMMSS.0Z" for e.g. "20220310151845.0Z"
 */
export const currentADCompliantTimestamp = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear().toString().padStart(4, '0');
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  const hour = now.getUTCHours().toString().padStart(2, '0');
  const minute = now.getUTCMinutes().toString().padStart(2, '0');
  const second = now.getUTCSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}.0Z`;
};

/**
 * This method returns the native JS __filename alternative as __filename is not
 * available in ES module scope.
 */
export const __filename = (moduleUrl: string): string => fileURLToPath(moduleUrl);

/**
 * This method returns the native JS __dirname alternative as __dirname is not
 * available in ES module scope.
 */
export const __dirname = (moduleUrl: string): string => path.dirname(__filename(moduleUrl));
