import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Config } from '../../main/config/config';
import LabelledInput from '../components/LabelledInput';

type SaveCredsResponse = {
  success: boolean;
  message?: string;
  state?: Config['state'];
  errors?: { msg: string }[];
};

type InputFields = 'orgID' | 'conString' | 'baseDN' | 'username' | 'password';

export type SaveCredsRequestBody = {
  [K in InputFields]: string;
};

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
  const [errors, setErrors] = useState<
    | {
        [K in InputFields]?: string | null;
      }
    | null
  >(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [inputErrs, setInputErrs] = useState<SaveCredsResponse['errors'] | null>(null);

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
    let orgIDErr,
      conStringErr,
      usernameErr,
      passwordErr = null;

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
      username: usernameErr,
      password: passwordErr,
    });

    // If there were any errors in this check, return false.
    if (orgIDErr || conStringErr || usernameErr || passwordErr) {
      return false;
    }

    return true;
  };

  const saveCredentials = (): void => {
    // Validate data before submission.
    if (!validate()) {
      return;
    }

    setSaving(true);

    fetch('http://localhost:6970/save', {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgID,
        conString,
        baseDN,
        username,
        password,
      }),
    })
      .then((res) => res.json())
      .then((data: SaveCredsResponse) => {
        // Check for validation errors.
        if (data.errors) {
          setInputErrs(data.errors);
          setShowModal(true);
          return;
        }

        // Check if the request succeeded.
        if (!data.success) {
          flashError(data.message);
          return;
        }

        //
      })
      .catch((error) => {
        flashError((error as Error).message);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <>
      <Dialog open={showModal} onClose={(): void => setShowModal(false)}>
        <DialogTitle>The following errors were encountered with your request.</DialogTitle>
        {inputErrs && (
          <DialogContent>
            <ul>
              {inputErrs.map((err, i) => (
                <li key={i}>- {err.msg}</li>
              ))}
            </ul>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={(): void => setShowModal(false)} autoFocus>
            Okay
          </Button>
        </DialogActions>
      </Dialog>
      <div className='text-lg font-semibold'>Meveto AD/LDAP Connector Configuration</div>
      <div className='mt-4'>
        The connector will need access to your AD or any LDAP store. Fill in the following information that&apos;s
        required for establishing a connection. This information is securely stored on this device and used by the
        connector internally. It&apos;s never transmitted to the Meveto servers.
      </div>
      <div className='mt-3'>
        To associate this connector&apos;s instance with your Meveto organization, you will need to enter its ID. The
        connector will use this ID to communicate with your organization.
      </div>
      <div className='mt-3 text-orange-400'>
        All values except the base Distinguished Name are required. When you press the &quot;Save&quot; button, the LDAP
        credentials will be tested to ensure a connection can be established.{' '}
        <strong>
          The password will be encrypted and stored on this device. It will never be transmitted over any network.
        </strong>
      </div>
      <LabelledInput
        label='Meveto Organization ID'
        placeholder='e.g. 12345-12345-12345'
        value={orgID}
        setValue={setOrgID}
        error={!!errors?.orgID}
        helperText={errors?.orgID}
      />
      <LabelledInput
        label='LDAP Connection String'
        placeholder='e.g. LDAP://your-dc.your-domain.com'
        value={conString}
        setValue={setConString}
        error={!!errors?.conString}
        helperText={
          errors?.conString ||
          'Make sure to enter "LDAP" or "LDAPS" in capital letters. "ldap" does not work with Active Directory.'
        }
      />
      <LabelledInput
        label='Base Distinguished Name'
        placeholder='e.g. CN=Users,DC=meveto,DC=com'
        value={baseDN}
        setValue={setBaseDN}
      />
      <LabelledInput
        label='Username'
        placeholder='e.g. administrator'
        value={username}
        setValue={setUsername}
        error={!!errors?.username}
        helperText={
          errors?.username ||
          'For Active Directory supported username formats are: "Administrator", "administrator@your-domain.com" and "your-domain\\administrator"'
        }
      />
      <LabelledInput
        label='Password'
        type='password'
        value={password}
        setValue={setPassword}
        error={!!errors?.password}
        helperText={errors?.password}
      />
      <div className='mt-10 flex justify-end'>
        <Button variant='contained' size='large' disabled={saving} onClick={saveCredentials}>
          {saving ? 'Testing and saving...' : 'Save'}
        </Button>
      </div>
    </>
  );
};

export default GetCredentials;
