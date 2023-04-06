import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { toast } from 'react-toastify';
import Time from '../components/Time';

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
  const navigate = useNavigate();

  const pullLastSync = (): Promise<void> =>
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

  /**
   * If the app's state exists in the local storage and indicates that the app is not ready yet or
   * if the app's state does not exist at all, then redirect to initial page "/".
   * Other wise, pull the latest sync time on mount.
   */
  useEffect(() => {
    if (!localStorage.getItem('state') || localStorage.getItem('state') !== 'ready') {
      navigate('/');
    } else {
      pullLastSync();
    }
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
        // Check if the request succeeded.
        if (!data.success) {
          flashError(data.message);
          return;
        }

        // Flash a success message
        toast.success('Syncing completed successfully!');

        // Pul latest sync info.
        pullLastSync();
      })
      .catch((error) => {
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
        <p className='text-sm font-semibold'>
          Last partial sync: <Time time={lastSync.partialGroup} />
        </p>
        <p className='text-sm font-semibold'>
          Last full sync: <Time time={lastSync.fullGroup} />
        </p>
      </div>
      <div className='mt-4 flex gap-x-4 items-center'>
        <Button variant='outlined' onClick={(): void => sync('partialGroups')} disabled={syncing}>
          Partial Groups Sync
        </Button>
        <Button variant='contained' onClick={(): void => sync('fullGroups')} disabled={syncing}>
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
        <p className='text-sm font-semibold'>
          Last partial sync: <Time time={lastSync.partialUser} />
        </p>
        <p className='text-sm font-semibold'>
          Last full sync: <Time time={lastSync.fullUser} />
        </p>
      </div>
      <div className='mt-4 flex gap-x-4 items-center'>
        <Button variant='outlined' onClick={(): void => sync('partialUsers')} disabled={syncing}>
          Partial Users Sync
        </Button>
        <Button variant='contained' onClick={(): void => sync('fullUsers')} disabled={syncing}>
          Full Users Sync
        </Button>
      </div>
    </>
  );
};

export default Home;
