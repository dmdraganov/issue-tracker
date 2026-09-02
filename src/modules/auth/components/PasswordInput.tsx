import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

export default function PasswordInput(props: ComponentProps<'input'>) {
  const [showPassword, setShowPassword] = useState(false);

  const TogglePasswordIcon = showPassword ? EyeOff : Eye;

  return (
    <InputGroup>
      <InputGroupInput type={showPassword ? 'text' : 'password'} {...props} />
      <InputGroupAddon align={'inline-end'}>
        <InputGroupButton
          type="button"
          onClick={() => setShowPassword(!showPassword)}
        >
          <TogglePasswordIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
