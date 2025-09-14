import { randomUUID as uuidV4 } from 'crypto';

export abstract class BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: Partial<BaseEntity>) {
    this.id = props.id ?? uuidV4();
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
