import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@mui/material';
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

const Layout = (props: LayoutProps): JSX.Element => {
  const { children } = props;
  const [id, setId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

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

  return (
    <>
      <div className='w-full px-8 flex items-center justify-between h-20 shadow-md'>
        <img src='../assets/logo.png' className='w-32 h-12' alt='Meveto Logo' />
        <div className='flex items-center gap-x-4'>
          {id && publicKey && (
            <Button variant='outlined' size='small' color='warning'>
              Disconnect
            </Button>
          )}
          {publicKey && (
            <Button variant='outlined' size='small' onClick={(): Id => toast(publicKey, { autoClose: 5000 })}>
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
