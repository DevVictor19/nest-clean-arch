import { BaseController } from '@/core/api/controllers/base-controller';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ClientEntity } from '../../domain/entities';
import { ClientDto, CreateClientDto, UpdateClientDto } from '../dtos';
import {
  CreateClientUseCase,
  DeleteClientUseCase,
  FindByIdClientUseCase,
  FindPaginatedClientsUseCase,
  UpdateClientUseCase,
} from '../../domain/usecases';
import { PaginatedResultDto } from '@/core/api/dtos/pagination-dtos';

@Controller({
  version: '1',
  path: 'clients',
})
export class ClientsController
  implements BaseController<ClientEntity, ClientDto>
{
  constructor(
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly deleteClientUseCase: DeleteClientUseCase,
    private readonly findByIdClientUseCase: FindByIdClientUseCase,
    private readonly findPaginatedClientsUseCase: FindPaginatedClientsUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateClientDto): Promise<ClientDto> {
    const client = await this.createClientUseCase.execute(dto);
    return this.toDto(client);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteClientUseCase.execute({ clientId: id });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientDto> {
    const client = await this.findByIdClientUseCase.execute({ clientId: id });
    return this.toDto(client);
  }

  @Get()
  async findAll(
    @Query('limit', new DefaultValuePipe(10)) limit: number,
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
  ): Promise<PaginatedResultDto<ClientDto>> {
    const result = await this.findPaginatedClientsUseCase.execute({
      limit,
      page,
      sort: { sortBy, sortOrder },
    });
    return {
      data: this.toCollectionDto(result.data),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientDto> {
    const client = await this.updateClientUseCase.execute({
      clientId: id,
      ...dto,
    });
    return this.toDto(client);
  }

  toDto(entity: ClientEntity): ClientDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      addresses: entity.addresses?.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        complement: address.complement,
      })),
    };
  }

  toCollectionDto(entities: ClientEntity[]): ClientDto[] {
    return entities.map((entity) => this.toDto(entity));
  }
}
