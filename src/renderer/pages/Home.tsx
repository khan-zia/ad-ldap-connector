import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const flashError = (message?: null | string): void => {
  toast.error(message || 'Oops! There was a problem while trying to sync. Contact Meveto if the issue persists.');
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

export type SyncAction = 'partialGroups' | 'fullGroups' | 'partialUsers' | 'fullUsers';

const Home = (): JSX.Element => {
  const [lastSync, setLastSync] = useState<LastSyncTime>({
    partialGroup: null,
    fullGroup: null,
    partialUser: null,
    fullUser: null,
  });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string>('');
  const [syncAction, setSyncAction] = useState<SyncAction | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

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

  const sync = (action: SyncAction): void => {
    setSyncAction(action);

    switch (action) {
      case 'partialGroups':
        setConfirmationMsg(
          'If this is the first time of partial groups syncing, then a full groups sync will be performed instead.'
        );
        break;
      case 'fullGroups':
        setConfirmationMsg(
          'All your AD/LDAP groups will be synced to your Meveto organization. This action will automatically delete any groups that were synced to Meveto before but are no longer available here on the AD/LDAP side.'
        );
        break;
      case 'partialUsers':
        setConfirmationMsg(
          'If this is the first time of partial users syncing, then a full users sync will be performed instead.'
        );
        break;
      case 'fullUsers':
        setConfirmationMsg(
          'All your AD/LDAP users will be synced to your Meveto organization. This action will automatically delete any users that were synced to Meveto before but are no longer available here on the AD/LDAP side.'
        );
        break;
      default:
        return;
    }

    setShowModal(true);
  };

  const beginSync = (): void => {
    if (!syncAction) return;
    setShowModal(false);
    setSyncing(true);
    toast.info('Syncing in progress. This process might take several minutes to complete.');

    fetch('http://localhost:6970/sync', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        syncAction,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        // Check if the request succeeded.
        if (!data.success) {
          flashError(data.message);
          return;
        }

        // Flash a success message
        toast.success('Syncing completed successfully!');
      })
      .catch((error) => {
        console.log('error');
        flashError((error as Error).message);
      })
      .finally(() => {
        setSyncing(false);
      });
  };

  return (
    <>
      <Dialog open={showModal} onClose={(): void => setShowModal(false)}>
        <DialogContent>
          <div className='text-xl font-semibold'>{confirmationMsg}</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={(): void => setShowModal(false)}>Cancel</Button>
          <Button onClick={beginSync} autoFocus>
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
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
        <Button variant='outlined' onClick={(): void => sync('partialGroups')}>
          Partial Groups Sync
        </Button>
        <Button variant='contained' onClick={(): void => sync('fullGroups')}>
          Full Groups Sync
        </Button>
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
        <Button variant='outlined' onClick={(): void => sync('partialUsers')}>
          Partial Users Sync
        </Button>
        <Button variant='contained' onClick={(): void => sync('fullUsers')}>
          Full Users Sync
        </Button>
      </div>
    </>
  );
};

export default Home;
