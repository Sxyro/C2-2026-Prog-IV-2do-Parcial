import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearComentarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  texto: string;
}
