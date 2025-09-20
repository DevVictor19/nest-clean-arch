import { BaseEntity } from '../../base-entity';

describe('BaseEntity', () => {
  it('should create an entity with default values', () => {
    class TestEntity extends BaseEntity {}
    const entity = new TestEntity({});
    expect(entity.id).toBeDefined();
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect(entity.createdAt.getTime()).toBeCloseTo(
      entity.updatedAt.getTime(),
      -2,
    );
  });

  it('should accept custom id, createdAt and updatedAt', () => {
    class TestEntity extends BaseEntity {}
    const now = new Date('2023-01-01T00:00:00Z');
    const entity = new TestEntity({
      id: 'custom-id',
      createdAt: now,
      updatedAt: now,
    });
    expect(entity.id).toBe('custom-id');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });

  it('should generate unique ids for different entities', () => {
    class TestEntity extends BaseEntity {}
    const entity1 = new TestEntity({});
    const entity2 = new TestEntity({});
    expect(entity1.id).not.toBe(entity2.id);
  });
});
