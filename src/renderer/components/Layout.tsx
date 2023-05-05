import { ReactNode, useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { Config } from '../../main/config/config';
import { Id, toast } from 'react-toastify';

type LayoutProps = {
  children?: ReactNode | undefined;
};

type InfoResponseProps = {
  success: boolean;
  id: Config['appID'];
  publicKey: Config['publicKey'];
};

type AvailableUpdateResponse = {
  currentVersion?: string;
  newVersion?: string;
  updateUrl?: string;
};

export type CheckUpdateResponse = AvailableUpdateResponse & {
  success: boolean;
  message?: string;
};

const Layout = (props: LayoutProps): JSX.Element => {
  const { children } = props;
  const [id, setId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [checkUpdate, setCheckUpdate] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<AvailableUpdateResponse | null | false>(null);
  const [updateInProgress, setUpdateInProgress] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<string>(
    'Update in progress. Please hold on as this could take a few minutes.'
  );
  const [successfulUpdate, setSuccessfulUpdate] = useState<boolean>(false);

  /**
   * Check and display the app's ID and public key if set in local storage.
   * Attempt to retrieve them if not.
   */
  useEffect(() => {
    const localID = localStorage.getItem('id');
    const localKey = localStorage.getItem('publicKey');

    if (localID && localKey) {
      setId(localID);
      setPublicKey(localKey);

      return;
    }

    fetch('http://localhost:6970/info')
      .then((res) => res.json())
      .then((data: InfoResponseProps) => {
        if (!data.success) {
          console.error('Error attempting to retrieve connector info.');
          return;
        }

        if (data.id && data.publicKey) {
          const sanitizedKey = data.publicKey
            .replace('-----BEGIN PUBLIC KEY-----', '')
            .replace('-----END PUBLIC KEY-----', '')
            .replaceAll('\n', '');
          setId(data.id);
          setPublicKey(sanitizedKey);

          // Store both values in the local storage.
          localStorage.setItem('id', data.id);
          localStorage.setItem('publicKey', sanitizedKey);
        }
      })
      .catch((error) => {
        console.error(`Error attempting to retrieve connector info: ${(error as Error).message}`);
      });
  }, []);

  const checkForUpdate = (): void => {
    setCheckingUpdate(true);
    setUpdateResult(null);

    fetch('http://localhost:6970/update')
      .then((res) => res.json())
      .then((data: CheckUpdateResponse) => {
        // Did it fail? :(
        if (!data.success) {
          setCheckUpdate(false);
          toast.error(data.message || 'Failed to check for an update.');
          return;
        }

        // Perhaps already up to date?
        if (data.message) {
          setCheckUpdate(false);
          toast.info(data.message);
          return;
        }

        const { currentVersion, newVersion, updateUrl } = data;
        setUpdateResult({ currentVersion, newVersion, updateUrl });
      })
      .catch((error) => {
        setUpdateResult(false);
        toast.error(`Error attempting to check for updates: ${(error as Error).message}`);
      })
      .finally(() => {
        setCheckingUpdate(false);
      });
  };

  const proceedWithUpdate = (): void => {
    if (!updateResult) {
      setCheckUpdate(true);
      return;
    }

    setCheckUpdate(false);
    setUpdateInProgress(true);

    fetch('http://localhost:6970/update', {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updateUrl: updateResult.updateUrl }),
    })
      .then((res) => res.json())
      .then((update: { success: boolean; message?: string }) => {
        // Did the update succeed? :)
        if (update.success) {
          setUpdateStatus(
            "Successfully updated the connector. If you are unable to see expected changes right away, you might need to clear your browser's cache for the connector."
          );
          setSuccessfulUpdate(true);
          return;
        }

        setUpdateInProgress(false);
        toast.error(update.message || 'Failed to complete the update. Please try manual update.');
      })
      .catch((error) => {
        setUpdateInProgress(false);
        toast.error(`Please try manual update. ${(error as Error).message}`);
      });
  };

  useEffect(() => {
    if (checkUpdate && !checkingUpdate && updateResult === null) checkForUpdate();
  }, [checkUpdate, checkingUpdate, updateResult]);

  return (
    <>
      <Dialog open={checkUpdate}>
        <DialogContent>
          {updateResult ? (
            <>
              <table className='table-auto w-48 text-lg'>
                <tbody>
                  <tr>
                    <td>Current version:</td>
                    <td>
                      <strong>{updateResult.currentVersion}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Available version:</td>
                    <td>
                      <strong>{updateResult.newVersion}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className='mt-4'>
                Proceed to automatically download and install update. Alternatively, or if automatic update fails, you
                can use the following link to manually download and install the new available version.
                <br />
                <a href={updateResult.updateUrl} className='text-blue-700 hover:underline'>
                  Click here to manually download the latest version
                </a>
              </div>
              <div className='mt-3 font-semibold'>
                After you press the PROCEED button, you will not be able to use the connector until the update is
                complete.
              </div>
            </>
          ) : (
            <div className='text-xl font-semibold'>Checking for updates...</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={(): void => setCheckUpdate(false)}>Cancel</Button>
          {updateResult && (
            <Button onClick={proceedWithUpdate} autoFocus>
              Proceed
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={updateInProgress}>
        <DialogContent>
          <div className='mt-3 font-semibold'>{updateStatus}</div>
        </DialogContent>
        <DialogActions>
          {successfulUpdate && (
            <Button onClick={(): void => {}} autoFocus>
              Okay
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <div className='w-full px-8 flex items-center justify-between h-20 shadow-md'>
        <img src='../assets/logo.png' className='w-32 h-12' alt='Meveto Logo' />
        <div className='flex items-center gap-x-4'>
          {id && publicKey && (
            <Button variant='outlined' size='small' onClick={(): void => setCheckUpdate(true)}>
              Check For Update
            </Button>
          )}
          {publicKey && (
            <Button
              variant='outlined'
              size='small'
              onClick={(): Id => toast(publicKey, { autoClose: false, draggable: false })}
            >
              View Public Key
            </Button>
          )}
          {id && <div className='text-lg font-semibold'>{id}</div>}
        </div>
      </div>
      <div className='py-8 px-10'>{children}</div>
    </>
  );
};

export default Layout;
