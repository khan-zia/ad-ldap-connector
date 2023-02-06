import process from 'node:process';
import childProcess from 'node:child_process';

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
