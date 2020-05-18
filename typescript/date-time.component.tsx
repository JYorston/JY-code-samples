import dayjs from 'dayjs';
import { css } from 'emotion';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import moment from 'moment';
import * as React from 'react';
import { ICheckAvailabilityResponseSlot } from '../../network/availability/check-availability.function';
import { rootStore } from '../../stores/root.store';
import { Button, buttonSize } from '../common/button.component';
import { ISelectValue, Select } from '../common/select.component';
import SpinnerWrapper from '../common/SpinnerWraper.component';
import { DateButton } from '../date_time/date-button.component';

interface IDateTimeState {
  selectValues: ISelectValue[];
  clickedButtonDate: string;
  selectedDeliverySlotId: number;
}
interface ICreateOrderProps {
  children?: React.ReactNode;
}

@observer
class DateTime extends React.Component<ICreateOrderProps, {}> {
  public state: IDateTimeState = {
    selectValues: [],
    clickedButtonDate: '',
    selectedDeliverySlotId: -1,
  };

  constructor(props: ICreateOrderProps) {
    super(props);
    this.getAvailabilitySlots();
  }

  public render() {
    return (
      <div>
        {this.renderSpinner()}
        <div
          className={css`
            margin: auto;
            width: fit-content;
            margin-top: 221px;
          `}
        >
          <div
            className={css`
              margin: auto;
              width: fit-content;
            `}
          >
            <h2>DATE &amp; TIME</h2>
          </div>
          <div
            className={css`
              margin-top: 47px;
            `}
          >
            <p>The TOSHI assistant will arrive on</p>
            <div
              className={css`
                display: flex;
              `}
            >
              {this.renderDateButtons()}
            </div>
            <div
              className={css`
                margin-top: 49px;
              `}
            >
              <p>Between</p>
              <Select
                values={this.state.selectValues}
                label={''}
                placeholder={'Please select a delivery window'}
                disabled={!rootStore.orderStore.getAvailabilitySlotsRetrieved}
                onChange={v => {
                  this.setState({ selectedDeliverySlotId: v });
                }}
              ></Select>
            </div>
          </div>
          <div
            className={css`
              margin-top: 76px;
            `}
          >
            <Button
              onClick={() => {
                this.setOrderDateTimeValues();
              }}
              disabled={!this.canConfirmDateTime()}
              buttonSize={buttonSize.large}
              fullWidth={true}
              linkTo={'/'}
            >
              confirm
            </Button>
          </div>
        </div>
      </div>
    );
  }

  private canConfirmDateTime = (): boolean => {
    return this.state.selectedDeliverySlotId !== -1 && this.state.clickedButtonDate !== '';
  };

  private findDeliverySlotSelectByID = (id: any): ISelectValue | null => {
    for (let i = 0; i < this.state.selectValues.length; i++) {
      if (this.state.selectValues[i].value.toString() === id.toString()) {
        return this.state.selectValues[i];
      }
    }
    return null;
  };

  private setOrderDateTimeValues = () => {
    if (this.state.selectedDeliverySlotId) {
      rootStore.orderStore.setOrderDeliverySlotId(this.state.selectedDeliverySlotId);
      rootStore.orderStore.setSelectedDeliverySlotOption(
        this.findDeliverySlotSelectByID(this.state.selectedDeliverySlotId),
      );

      const momentDate = moment.utc(this.state.clickedButtonDate);

      rootStore.orderStore.setOrderScheduledDate(momentDate.toString());
    }
  };

  private getAvailabilitySlots = () => {
    rootStore.orderStore.fetchAvailabilitySlots();
  };

  private renderDateButtons = () => {
    const dates = rootStore.orderStore.getAvailabilitySlots?.dates;
    if (dates) {
      return Object.keys(dates).map((date: string) => (
        <DateButton
          key={date}
          date={date}
          selected={this.isButtonSelected(date)}
          disabled={false}
          onClick={() => {
            this.setScheduledTimeSelectValues(date);
          }}
        ></DateButton>
      ));
    }
  };

  private isButtonSelected = (date: string) => {
    if (this.state.clickedButtonDate === date) {
      return true;
    }

    return false;
  };

  private setScheduledTimeSelectValues = (date: string) => {
    const datesObject = toJS(rootStore.orderStore.getAvailabilitySlots?.dates);

    if (datesObject) {
      const deliverySlots = datesObject[date];

      const values: ISelectValue[] = [];

      deliverySlots.map((deliverySlot: ICheckAvailabilityResponseSlot) =>
        values.push({
          value: deliverySlot.delivery_slot_id,
          display: this.formatSelectValueDisplay(deliverySlot.start_time, deliverySlot.end_time),
          disabled: !deliverySlot.available,
        }),
      );

      const selectedDeliverySlot = this.findAvailableDeliverySlotIndex(values);
      this.setState({ selectValues: values, clickedButtonDate: date, selectedDeliverySlotId: selectedDeliverySlot });
    }
  };

  private findAvailableDeliverySlotIndex = (values: any): number | null => {
    for (let i = 0; i < values.length; i++) {
      if (!values[i].disabled) {
        return values[i].value;
      }
    }

    return null;
  };

  private formatSelectValueDisplay = (start: string, end: string) => {
    const formattedStart = moment.utc(start).format('h:mm');
    const formattedEnd = moment.utc(end).format('h:mma');
    return `${formattedStart} - ${formattedEnd}`;
  };

  private renderSpinner = () => {
    if (!rootStore.orderStore.getAvailabilitySlotsRetrieved) {
      return <SpinnerWrapper></SpinnerWrapper>;
    }
  };
}

export { DateTime, ICreateOrderProps };
