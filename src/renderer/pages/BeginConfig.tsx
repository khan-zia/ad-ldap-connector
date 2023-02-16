import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from '@mui/material';
import CopyableText from '../components/CopyableText';

type BeginConfigResponse = {
  success: boolean;
  message?: string;
  id?: string;
  publicKey?: string;
};

const flashError = (message?: null | string): void => {
  toast.error(
    message || 'Oops! There was a problem while configuring the connector. Contact Meveto if the issue persists.'
  );
};

const BeginConfig = (): JSX.Element => {
  const [configuring, setConfiguring] = useState<boolean>(false);
  const [id, setId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const beginConfiguration = (): void => {
    setConfiguring(true);

    fetch('http://localhost:6970/configure', { method: 'post' })
      .then((res) => res.json())
      .then((data: BeginConfigResponse) => {
        setConfiguring(false);

        if (!data.success) {
          flashError(data.message);
          return;
        }

        if (data.id && data.publicKey) {
          setId(data.id);
          setPublicKey(
            data.publicKey.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '')
          );
        }
      })
      .catch((error) => {
        setConfiguring(false);
        flashError((error as Error).message);
      });
  };

  return (
    <>
      <Toaster />
      {id && publicKey ? (
        <>
          <div className='text-lg font-semibold'>Meveto AD/LDAP Connector Configuration</div>
          <div className='mt-4'>
            The connector has successfully generated a unique identifier (Connector ID) and a pair of a public and
            private keys. The private key has been encrypted and stored on this computer's file system. Only
            Administrator users running elevated processes will have the ability to decrypt and retrieve the connector's
            private key in plain text. Please ensure that Administrator users never run or install untrusted software on
            this computer.
          </div>
          <div className='mt-3'>
            Collect the following Connector ID and Public Key. These are required to register this connector instance
            with your Meveto organization using the organization dashboard.
          </div>
          <div className='mt-6'>
            <CopyableText title='Connector ID' text={id} />
          </div>
          <div className='mt-6'>
            <CopyableText title='Public Key' text={publicKey} />
          </div>
        </>
      ) : (
        <>
          <div className='text-lg font-semibold'>Welcome to the Meveto AD/LDAP Connector</div>
          <div className='mt-4'>
            The connector needs configuration. It will generate a connector ID which is a unique identifier for the
            connector instance and a public private key pair. You will need the connector ID and the public key to add
            this connector to your Meveto organization using the organization admin dashboard.
          </div>
          <div className='mt-8'>
            <Button variant='contained' onClick={beginConfiguration} disabled={configuring}>
              {configuring ? 'Configuring...' : 'Begin Configuration'}
            </Button>
          </div>
        </>
      )}
    </>
  );
};

export default BeginConfig;
