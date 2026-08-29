import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  email: string = '';

  @ApiProperty()
  firstName: string = '';

  @ApiProperty()
  lastName: string = '';

  @ApiProperty()
  isEmailVerified: boolean = false;

  @ApiProperty()
  role: string = 'member';

  @ApiProperty()
  createdAt: Date = new Date();
}

export class LoginResponseDto {
  @ApiProperty()
  success: boolean = true;

  @ApiProperty()
  message: string = '';

  @ApiProperty()
  data: {
    accessToken: string;
    user: UserResponseDto;
  } = {
    accessToken: '',
    user: new UserResponseDto(),
  };
}

export class RegisterResponseDto {
  @ApiProperty()
  success: boolean = true;

  @ApiProperty()
  message: string = '';

  @ApiProperty()
  data: {
    email: string;
    message: string;
  } = {
    email: '',
    message: '',
  };
}

export class VerifyEmailResponseDto {
  @ApiProperty()
  success: boolean = true;

  @ApiProperty()
  message: string = '';

  @ApiProperty()
  data: {
    email: string;
    isEmailVerified: boolean;
  } = {
    email: '',
    isEmailVerified: false,
  };
}

export class GenericResponseDto<T> {
  @ApiProperty()
  success: boolean = true;

  @ApiProperty()
  message: string = '';

  @ApiProperty()
  data?: T;

  @ApiProperty()
  error?: string;
}
