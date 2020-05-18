import { action, computed, observable } from 'mobx';
import { originUrl } from '../config/Url';
import { createCustomer, ICreateCustomerResponse, INewAddressData, INewCustomerData } from '../network/customers/create-customer.function';
import { getCustomers, IGetCustomerResponse } from '../network/customers/get-customers.function';
import { checkAddressEligibility } from '../network/helpers/check-address-eligibility.function';
import { IAddress } from './../interfaces/address.interface';
import { ICustomer } from './../interfaces/customer.interface';
import { rootStore } from './root.store';

export class CustomerStore {
  @observable
  private customer: ICustomer | null = null

  @observable
  private address: IAddress | null = null

  constructor() {
    this.customer = null;
    this.address = null;
  }

  @computed
  get customerValue(): ICustomer | null {
    return this.customer;
  }

  @computed
  get addressValue(): IAddress | null {
    return this.address;
  }

  @computed
  get customerDetailsComplete(): boolean {
    return this.customer !== null && this.address !== null;
  }

  @action
  public setCustomer(customer: ICustomer): void {
    this.customer = customer;
  }

  @action
  public setAddress(address: IAddress): void {
    this.address = address;
  }

  @action
  public clearCustomerInfo() {
    this.customer = null;
    this.address = null;
  }

  @action
  public async createCustomer(customer: INewCustomerData, address: INewAddressData): Promise<boolean> {
    const clientKey = rootStore.storeStore.getStoreConfig?.key;

    if (clientKey) {
      const response = await createCustomer({
        baseUrl: originUrl(),
        clientKey,
        data: {
          customer,
          address,
        },
      });

      if (response.status === 200) {
        this.mapCustomerResponseData(response.data);
        return true;
      }
    }

    return false;
  }

  @action
  public async checkPostcodeEligibility(postcode: string): Promise<boolean> {
    const clientKey = rootStore.storeStore.getStoreConfig?.key;

    if (clientKey) {
      const response = await checkAddressEligibility({
        baseUrl: originUrl(),
        clientKey,
        data: { postcode },
      });

      if (response.data.eligible) {
        return true;
      }
    }

    return false;
  }

  @action
  public async searchCustomersRequest(query: string): Promise<IGetCustomerResponse[]> {
    const clientKey = rootStore.storeStore.getStoreConfig?.key;
    if (clientKey) {
      const response = await getCustomers({
        baseUrl: originUrl(),
        clientKey,
        data: { query },
      });
      return response.data;
    }

    return [];
  }

  @action
  private mapCustomerResponseData(responseData: ICreateCustomerResponse ): void {
    const newCustomer: ICustomer = {
      id: responseData.id,
      title: responseData.title,
      name: responseData.name,
      surname: responseData.surname,
      email: responseData.email,
      contactNumber: responseData.contact_number,
    }
    const newCustomerAddress: IAddress = {
      id: responseData.last_address.id,
      houseName: responseData.last_address.house_name || '',
      line1: responseData.last_address.line_1,
      line2: responseData.last_address.line_2 || '',
      cityTown: responseData.last_address.city_town || '',
      postCodeZipCode: responseData.last_address.postcode_zipcode,
    }
    this.setCustomer(newCustomer);
    this.setAddress(newCustomerAddress);
  }
}
