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

type UpdateResponseProps = {
  success: boolean;
  message?: string;
  currentVersion?: string;
  newVersion?: string;
  downloadUrl?: string;
};

const Layout = (props: LayoutProps): JSX.Element => {
  const { children } = props;
  const [id, setId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [checkUpdate, setCheckUpdate] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<
    | {
        currentVersion: string;
        newVersion: string;
        downloadUrl: string;
      }
    | null
    | false
  >(null);

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
      .then((data: UpdateResponseProps) => {
        // Perhaps already up to date?
        if (data.success && data.message) {
          toast.info(data.message);
          setCheckUpdate(false);
          return;
        }

        if (data.currentVersion && data.newVersion && data.downloadUrl) {
          setUpdateResult({
            currentVersion: data.currentVersion,
            newVersion: data.newVersion,
            downloadUrl: data.downloadUrl,
          });
        } else {
          setUpdateResult(false);
          toast.error(data.message || 'Attempt to check for an update failed.');
        }
      })
      .catch((error) => {
        setUpdateResult(false);
        toast.error(`Error attempting to check for updates: ${(error as Error).message}`);
      })
      .finally(() => {
        setCheckingUpdate(false);
      });
  };

  const downloadUpdate = (): void => {
    //
  };

  useEffect(() => {
    if (checkUpdate && !checkingUpdate && updateResult === null) checkForUpdate();
  }, [checkUpdate, checkingUpdate, updateResult]);

  return (
    <>
      <Dialog open={checkUpdate}>
        <DialogContent>
          {!checkingUpdate && !updateResult && (
            <div className='text-xl font-semibold text-red-600'>
              Failed to check for updates. Please try again in a while.
            </div>
          )}
          {checkingUpdate && <div className='text-xl font-semibold'>Checking for updates...</div>}
          {updateResult && (
            <>
              <table className='table-auto'>
                <tbody>
                  <tr>
                    <td>Current version</td>
                    <td>
                      <strong>{updateResult.currentVersion}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Available version</td>
                    <td>
                      <strong>{updateResult.newVersion}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className='mt-4 text-lg'>
                Click PROCEED button to automatically download and install update. Alternatively, or if automatic update
                fails, you can use the following link to manually download and install the new available version.
                <br />
                <a href={updateResult.downloadUrl}>Manually download the latest version</a>
              </div>
              <div className='mt-3 text-lg font-semibold'>
                After you press the PROCEED button, you will not be able to use connector until the update is completed.
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={(): void => setCheckUpdate(false)}>Cancel</Button>
          {updateResult && (
            <Button onClick={downloadUpdate} autoFocus>
              Proceed
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
