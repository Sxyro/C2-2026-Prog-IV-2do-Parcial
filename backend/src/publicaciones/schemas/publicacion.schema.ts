import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PublicacionDocument = HydratedDocument<Publicacion>;

@Schema({ _id: false })
export class Comentario {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario', required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true, maxlength: 500 })
  texto: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);

@Schema({ timestamps: true })
export class Publicacion {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, trim: true, maxlength: 120 })
  titulo: string;

  @Prop({ required: true, trim: true, maxlength: 3000 })
  descripcion: string;

  @Prop({ default: '' })
  imagen: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario', required: true })
  usuario: Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Usuario' }] })
  likes: Types.ObjectId[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];

  @Prop({ default: true })
  activa: boolean;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
