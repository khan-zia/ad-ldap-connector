import { Button } from '@mui/material';
import copy from 'copy-to-clipboard';

type CopyableTextProps = {
  title?: string;
  text: string;
};

const CopyableText = ({ title, text }: CopyableTextProps): JSX.Element => {
  const copyText = () => copy(text || '', { format: 'text/plain' });

  return (
    <>
      {title && <div className='text-md font-semibold mb-2'>{title}</div>}
      <div className='p-4 rounded bg-white drop-shadow-lg min-w-fit max-w-xl flex flex-nowrap items-center justify-between gap-x-2'>
        <div className='text-xl font-semibold text-center'>{text}</div>
        <div>
          <Button variant='outlined' size='small' onClick={copyText}>
            Copy
          </Button>
        </div>
      </div>
    </>
  );
};

export default CopyableText;
