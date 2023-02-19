import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { Config } from '../../main/config/config';
import LabelledInput from '../components/LabelledInput';

type SaveCredsResponse = {
  success: boolean;
  message?: string;
  state?: Config['state'];
};

type InputFields = 'orgID' | 'conString' | 'baseDN' | 'username' | 'password';

const flashError = (message?: null | string): void => {
  toast.error(
    message || 'Oops! There was a problem while trying to save the credentials. Contact Meveto if the issue persists.'
  );
};

const GetCredentials = (): JSX.Element => {
  const [saving, setSaving] = useState<boolean>(false);
  const [orgID, setOrgID] = useState<string | null>(null);
  const [conString, setConString] = useState<string | null>(null);
  const [baseDN, setBaseDN] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
      [K in InputFields]?: string | null;
    } | null>(null);

  const navigate = useNavigate();

  /**
   * If the app's state exists in the local storage and indicates that the app's credentials
   * have already been collected, then redirect user to the main launch page.
   */
  useEffect(() => {
    if (!localStorage.getItem('state') || localStorage.getItem('state') !== 'pendingCredentials') {
      navigate('/');
    }
  }, []);

  /** Validates user's input. */
  const validate = (): boolean => {
    let orgIDErr, conStringErr, baseDNErr, usernameErr, passwordErr = null;
  
    // Validate orgID
    if (!orgID) {
      orgIDErr = 'Specify your Meveto Organization ID.';
    }

    if (orgID && orgID.length < 17) {
      orgIDErr = 'Your Meveto Organization ID is at least 17 characters that looks like "12345-12345-12345".';
    }

    // Validate conString
    if (!conString) {
      conStringErr = 'Specify the LDAP connection string that looks like "LDAP://your-org-domain".';
    }

    // Validate baseDN
    if (!baseDN) {
      baseDNErr = 'Specify the base DN (Distinguished Name). It looks like "cn=jdoe,ou=Sales,dc=MyDomain,dc=com".';
    }

    // Validate username
    if (!username) {
      usernameErr = 'Specify username of the LDAP user you wish to use for the connection.';
    }

    // Validate password
    if (!password) {
      passwordErr = 'Specify password of the LDAP user you wish to use for the connection.';
    }

    // Set errors if any.
    setErrors({
      orgID: orgIDErr,
      conString: conStringErr,
      baseDN: baseDNErr,
      username: usernameErr,
      password: passwordErr,
    });

    // If there were any errors in this check, return false.
    if (orgIDErr || conStringErr || baseDNErr || usernameErr || passwordErr) {
      return false;
    }

    return true;
  }

  const saveCredentials = (): void => {
    // Validate data before submission.
    if (!validate()) {
      return;
    }

    fetch('http://localhost:6970/save', { method: 'post', headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }, body: JSON.stringify({
      orgID,
      conString,
      baseDN,
      username,
      password,
    })})
      .then((res) => res.json())
      .then((data: SaveCredsResponse) => {
        if (!data.success) {
          flashError(data.message);
          return;
        }

        //
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
      <div className='mt-3 text-orange-600'>
        All the values are required. When you press the "Save" button, before saving, the LDAP credentials will be tested to ensure a connection can be established.
      </div>
      <LabelledInput label='Meveto Organization ID' value={orgID} setValue={setOrgID} error={!!errors?.orgID} helperText={errors?.orgID} />
      <LabelledInput label='LDAP Connection String' value={conString} setValue={setConString} error={!!errors?.conString} helperText={errors?.conString} />
      <LabelledInput label='Base DN' value={baseDN} setValue={setBaseDN} error={!!errors?.baseDN} helperText={errors?.baseDN} />
      <LabelledInput label='Username' value={username} setValue={setUsername} error={!!errors?.username} helperText={errors?.username} />
      <LabelledInput label='Password' type='password' value={password} setValue={setPassword} error={!!errors?.password} helperText={errors?.password} />
      <div className='mt-10 flex justify-end'>
        <Button variant='contained' size='large' disabled={saving} onClick={saveCredentials}>
          {saving ? 'Testing and saving...' : 'Save'}
        </Button>
      </div>
    </>
  );
};

export default GetCredentials;
