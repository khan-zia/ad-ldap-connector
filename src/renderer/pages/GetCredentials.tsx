import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { Config } from '../../main/config/config';
import LabelledInput from '../components/LabelledInput';

type BeginConfigResponse = {
  success: boolean;
  message?: string;
  id?: Config['appID'];
  publicKey?: Config['publicKey'];
  state?: Config['state'];
};

const flashError = (message?: null | string): void => {
  toast.error(
    message || 'Oops! There was a problem while configuring the connector. Contact Meveto if the issue persists.'
  );
};

const GetCredentials = (): JSX.Element => {
  const [testing, setTesting] = useState<boolean>(false);
  const [orgID, setOrgID] = useState<string | null>(null);
  const [conString, setConString] = useState<string | null>(null);
  const [baseDN, setBaseDN] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * If the app's state exists in the local storage and indicates that the app's credentials
   * have already been collected, then redirect user to the main launch page.
   */
  useEffect(() => {
    if (localStorage.getItem('state') && localStorage.getItem('state') !== 'pendingCredentials') {
      navigate('/');
    }
  }, []);

  const beginConfiguration = (): void => {
    fetch('http://localhost:6970/configure', { method: 'post' })
      .then((res) => res.json())
      .then((data: BeginConfigResponse) => {
        if (!data.success) {
          flashError(data.message);
          return;
        }

        if (data.id && data.publicKey && data.state) {
        }
      })
      .catch((error) => {
        flashError((error as Error).message);
      });
  };

  return (
    <>
      <Toaster />
      <div className='text-lg font-semibold'>Meveto AD/LDAP Connector Configuration</div>
      <div className='mt-4'>
        The connector will need access to your AD or any LDAP store. Fill in the following information that's required
        for establishing a connection. This information is securely stored on this device and used by the connector
        internally. It's never transmitted to the Meveto servers.
      </div>
      <div className='mt-3'>
        To associate this connector's instance with your Meveto organization, you will need to enter its ID. The
        connector will use this ID to communicate with your organization.
      </div>
      <LabelledInput label='Meveto Organization ID' value={orgID} setValue={setOrgID} />
      <LabelledInput label='LDAP Connection String' value={conString} setValue={setConString} />
      <LabelledInput label='Base DN' value={baseDN} setValue={setBaseDN} />
      <LabelledInput label='Username' value={username} setValue={setUsername} />
      <LabelledInput label='Password' type='password' value={password} setValue={setPassword} />
      <div className='mt-10 flex justify-end'>
        <Button variant='contained' size='large'>
          Save
        </Button>
      </div>
    </>
  );
};

export default GetCredentials;
