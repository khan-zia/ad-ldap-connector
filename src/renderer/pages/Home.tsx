import { toast } from 'react-toastify';

const flashError = (message?: null | string): void => {
  toast.error(
    message || 'Oops! There was a problem while trying to lauch the connector. Contact Meveto if the issue persists.'
  );
};

const Home = (): JSX.Element => {
  return <>Oh, Hey!</>;
};

export default Home;
