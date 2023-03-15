import { ToastContainer } from 'react-toastify';

const Toaster = (): JSX.Element => (
  <ToastContainer
    position='top-center'
    autoClose={2000}
    hideProgressBar={true}
    closeOnClick={false}
    newestOnTop={true}
    draggable={false}
  />
);

export default Toaster;
