export interface BaseController<Entity, Dto> {
  toDto(entity: Entity): Dto;
  toCollectionDto(entities: Entity[]): Dto[];
}
