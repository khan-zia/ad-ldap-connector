import { Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const flashError = (message?: null | string): void => {
  toast.error(
    message || 'Oops! There was a problem while trying to lauch the connector. Contact Meveto if the issue persists.'
  );
};

type LastSyncTime = {
  partialGroup: null | string;
  fullGroup: null | string;
  partialUser: null | string;
  fullUser: null | string;
};

export type LastSyncResponse = {
  success: boolean;
  message?: string;
  lastSync?: LastSyncTime;
};

const Home = (): JSX.Element => {
  const [lastSync, setLastSync] = useState<LastSyncTime>({
    partialGroup: null,
    fullGroup: null,
    partialUser: null,
    fullUser: null,
  });

  useEffect(() => {
    fetch('http://localhost:6970/last-sync')
      .then((res) => res.json())
      .then((data: LastSyncResponse) => {
        if (!data.success) {
          flashError(data.message);
          return;
        }

        if (data.lastSync) {
          setLastSync(data.lastSync);
        }
      })
      .catch((error) => {
        flashError((error as Error).message);
      });
  }, []);

  return (
    <>
      <div className='text-xl font-semibold'>Sync Groups</div>
      <div>
        Sync your Active Directory or any LDAP store groups. Make sure you understand how the group syncing behaves.
        Learn more in our in-depth guide.
      </div>
      <hr className='mt-2 border-gray-300' />
      <div className='p-2 mt-2 bg-gray-100 rounded'>
        <p className='text-sm font-semibold'>Last partial sync: {lastSync.partialGroup || 'Never'}</p>
        <p className='text-sm font-semibold'>Last full sync: {lastSync.fullGroup || 'Never'}</p>
      </div>
      <div className='mt-4 flex gap-x-4 items-center'>
        <Button variant='outlined'>Partial Groups Sync</Button>
        <Button variant='contained'>Full Groups Sync</Button>
      </div>
      <div className='mt-12 text-xl font-semibold'>Sync Users</div>
      <div>
        Sync your Active Directory or any LDAP store users. Make sure you understand how the user syncing behaves. Learn
        more in our in-depth guide.
      </div>
      <hr className='mt-2 border-gray-300' />
      <div className='p-2 mt-2 bg-gray-100 rounded'>
        <p className='text-sm font-semibold'>Last partial sync: {lastSync.partialUser || 'Never'}</p>
        <p className='text-sm font-semibold'>Last full sync: {lastSync.fullUser || 'Never'}</p>
      </div>
      <div className='mt-4 flex gap-x-4 items-center'>
        <Button variant='outlined'>Partial Users Sync</Button>
        <Button variant='contained'>Full Users Sync</Button>
      </div>
    </>
  );
};

export default Home;
