import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearPublicacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  descripcion: string;
}
