import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: 'Username must be 3-20 characters (letters, numbers, underscores)'
  })
  username: string;

  @IsNotEmpty()
  @IsEmail() // Remove this if allowing phone numbers
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, {
    message: 'Password must be at least 8 characters with 1 letter and 1 number'
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'NIM/NIDN cannot be empty' }) // Or @IsOptional() if it's not mandatory
  @Matches(/^[0-9A-Za-z\/.-]+$/, { // Basic alphanumeric, allows '/', '.', '-' common in NIM/NIDN
      message: 'NIM/NIDN contains invalid characters'
  })
  nimNidn: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number cannot be empty' }) // Or @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number format. Please include country code if applicable (e.g., +62).' }) // 'undefined' allows international formats
  phoneNumber: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}