import { Button, TextField, TextFieldProps } from '@mui/material';
import copy from 'copy-to-clipboard';

type InputProps = TextFieldProps & {
  value: null | string;
  setValue: React.Dispatch<React.SetStateAction<null | string>>;
};

const LabelledInput = ({ value, setValue, ...rest }: InputProps): JSX.Element => {
  return (
    <>
      <div className='mt-5 max-w-2xl'>
        <TextField
          variant='outlined'
          defaultValue={value}
          fullWidth
          {...rest}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setValue(event.target.value);
          }}
        />
      </div>
    </>
  );
};

export default LabelledInput;
