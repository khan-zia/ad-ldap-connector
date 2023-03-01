import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Config } from '../../main/config/config';

type AppStateResponse = {
  success: boolean;
  message?: string;
  state?: Config['state'];
};

const flashError = (message?: null | string): void => {
  toast.error(
    message || 'Oops! There was a problem while trying to lauch the connector. Contact Meveto if the issue persists.'
  );
};

/**
 * This component is mounted when user visits the main URL (Landing).
 * It aims to determine the state of the connector and thus navigate to the
 * appropriate page.
 */
const Launch = (): JSX.Element => {
  const [launching, setLaunching] = useState<boolean>(false);
  const navigate = useNavigate();

  const navigateByState = (state: Config['state']): void => {
    switch (state) {
      case 'pendingConfig':
        navigate('/configure');
        break;
      case 'pendingCredentials':
        navigate('/get-credentials');
        break;
      case 'ready':
        navigate('/home');
        break;
      default:
        flashError();
    }
  };

  const launch = (): void => {
    setLaunching(true);

    fetch('http://localhost:6970/state')
      .then((res) => res.json())
      .then((data: AppStateResponse) => {
        setLaunching(false);

        if (!data.success || !data.state) {
          flashError(data.message);
          return;
        }

        // Store the app's state in local storage.
        localStorage.setItem('state', data.state);

        // Navigate
        navigateByState(data.state);
      })
      .catch((error) => {
        setLaunching(false);
        flashError((error as Error).message);
      });
  };

  // Determine state upon mount.
  useEffect(() => {
    // if a state has been determined already.
    const state: Config['state'] | null = localStorage.getItem('state') as Config['state'];

    if (state) {
      navigateByState(state);
      return;
    }

    // Fetch app's state
    launch();
  }, []);

  return <>{launching && <div className='text-xl font-bold'>Launching connector...</div>}</>;
};

export default Launch;
