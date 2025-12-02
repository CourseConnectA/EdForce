import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchemaController } from './schema.controller';
import { SchemaService } from './schema.service';

@Module({
  imports: [TypeOrmModule],
  controllers: [SchemaController],
  providers: [SchemaService],
})
export class SchemaModule {}
