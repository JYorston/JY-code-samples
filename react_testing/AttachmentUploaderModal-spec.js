import React from 'react';
import AttachmentUploaderModal from '../../components/AttachmentUploaderModal';
import { shallow } from 'enzyme';
import fetchMock from 'fetch-mock';

const mockWindowObjects = () => {
  window.fb = {};
};

const createAttachment = () => {
  return {
    file: {
      name: 'test.pdf',
      size: 123
    },
    s3Key: '',
    index: 0,
    inS3: false,
    uploadInProgress: false
  };
};

const signedUrlData = () => {
  return {
    url_fields: {
      key: '123'
    },
    signed_url: 'https://s3.amazonaws.com/attachments/123'
  };
};

const createCloseModalSpy = () => {
  return jasmine.createSpy('close_modals');
};

const createDestroySpy = () => {
  return jasmine.createSpy('destroyReactNode');
};

const createInstanceAndSetState = () => {
  const attachment = createAttachment();

  const instance = shallow(
    <AttachmentUploaderModal
      customer_name={ "Test Testington" }
      customer_urn={ "urn:banco:attachment:CTEE8SXO" }
    />
  ).instance();

  instance.setState({ attachments: [attachment] });

  return instance;
};

describe('<AttachmentUploaderModal />', () => {
  describe('renders and initiates correct components', () => {
    it('renders the upload Table and dropzone containers', () => {
      const wrapper = shallow(
        <AttachmentUploaderModal
          customer_name={ "Test Testington" }
          customer_urn={ "urn:banco:attachment:CTEE8SXO" }
        />
      );
      // Find dropzone and react table containers
      expect(wrapper.find('.col-md-5').length).toBe(1);
      expect(wrapper.find('.col-md-7').length).toBe(1);
    });
  });

  describe('class methods', () => {
    beforeEach(() => {
      mockWindowObjects();
    });

    it('adds a file and updates the state', () => {
      const instance = createInstanceAndSetState();
      const files = [
        {
          name: 'test.pdf',
          size: 123
        }
      ];

      instance.addAttachments(files);
      expect(instance.state.attachments.length).toBe(files.length);
      expect(instance.state.attachments[0].file.name).toBe(files[0].name);
    });

    it('gets a signed url', async() => {
      const instance = createInstanceAndSetState();

      fetchMock.post(`uploads/signed_s3_upload_url`, {
      });

      await instance.getSignedUrl();

      expect(fetchMock.lastCall()[0]).toEqual(
        `uploads/signed_s3_upload_url`
      );
    });

    it('posts to s3', () => {
      const instance = createInstanceAndSetState();
      const attachment = createAttachment();
      const data = signedUrlData();

      fetchMock.post(`https://s3.amazonaws.com/attachments/123`, {
        message: 'ok',
        status: 200
      });

      fetchMock.post(`/customers/CTEE8SXO/attachments`, {
        message: 'ok',
        status: 201
      });

      fb.close_modals = createCloseModalSpy();
      fb.destroyReactNode = createDestroySpy();

      instance.uploadToS3(attachment, data);

      expect(fetchMock.lastCall()[0]).toEqual(
        `https://s3.amazonaws.com/attachments/123`
      );
    });

    it('does not upload the attachment whilst upload is in progress', () => {
      const instance = createInstanceAndSetState();

      fetchMock.post(`uploads/signed_s3_upload_url`, {
        status: 200,
        data: { signed_url: 'https://s3.amazonaws.com/attachments/123' }
      });

      // Call it once to start upload
      instance.uploadAttachments();

      // Call it again to test it doesn't re-upload
      instance.uploadAttachments();

      // Should only have hit the signed url endpoint once
      expect(fetchMock.calls().matched.length).toEqual(1);
    });
  });
});
