import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BeginConfig from './pages/BeginConfig';
import GetCredentials from './pages/GetCredentials';
import Launch from './pages/Launch';

const App = (): JSX.Element => {
  return (
    <Layout>
      <Routes>
        <Route path='/' element={<Launch />} />
        <Route path='/configure' element={<BeginConfig />} />
        <Route path='/get-credentials' element={<GetCredentials />} />
        <Route
          path='*'
          element={
            <>
              <div className='text-2xl font-bold flex justify-center'>404 😞</div>
              <div className='mt-4 text-lg font-semibold flex justify-center'>
                I am not quite sure what you are looking for. If you have lost your way, please get in touch with
                Meveto.
              </div>
            </>
          }
        />
      </Routes>
    </Layout>
  );
};

export default App;
