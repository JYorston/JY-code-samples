import React, { Component } from 'react';
import { Modal, Button } from 'react-bootstrap';
import ReactTable from 'react-table';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { post } from 'banco/app/banco-ui/util/ajax';
import { urnToRef } from 'banco/app/banco-ui/util/formatter';
import styles from '../styles/AttachmentUploaderModal.css';

class AttachmentUploaderModal extends Component {
  constructor(props) {
    super(props);
  }

  state = {
    attachments: []
  };

  /**
   * S3 Supports sending a 201
   * which it responds with bucket and key
   * of uploaded object
   *
   * E.g. https://blog.bigbinary.com/2018/09/04/
   * uploading-files-directly-to-s3-using-pre-signed-post-request.html
   *
   * Local stack does not support this, so
   * we set the key based on our backend response
   * rather than the s3 response
   */
  /* eslint-disable max-statements */
  uploadToS3 = async(attachment, data) => {

    let fd = new FormData();

    for (let field in data.url_fields) {
      if (data.url_fields.hasOwnProperty(field)) {
        fd.append(field, data.url_fields[field]);
      }
    }
    fd.append('file', attachment.file);
    fd.append('x-amz-acl', 'public-read');

    try {
      const response = await fetch(data.signed_url, {
        method: 'POST',
        body: fd,
        enctype: 'multipart/form-data'
      });
      if (!response.ok) {
        throw Error(response.statusText);
      }
      let s3Key = data.url_fields.key;
      this.updateStateAndServer(attachment, s3Key);
    } catch (err) {
      this.handleS3Error(attachment);
    }
  };

  handleS3Error = (attachment) => {
    let attachments = this.state.attachments;
    attachments[attachment.index].uploadInProgress = false;
    this.setState({ attachments });
  };

  updateStateAndServer = (attachment, s3Key) => {
    let attachments = this.state.attachments;
    attachments[attachment.index].s3Key = s3Key;
    attachments[attachment.index].inS3 = true;
    attachments[attachment.index].uploadInProgress = false;
    this.setState({ attachments }, this.destroyIfAllInS3);
    this.updateServer(attachment);
  };

  destroyIfAllInS3 = () => {
    let allUploadedToS3 = !this.state.attachments.some(el => !el.inS3);

    if (allUploadedToS3) {
      this.destroy();
    }
  };

  /**
   * We must manually deconstruct
   * ourselves as there is no
   * top level component to
   * conditionally trigger
   * a react render
   */
  destroy = () => {
    fb.destroyReactNode(document.getElementById('AttachmentUploaderModal'));
    fb.close_modals();
  };

  updateServer = async(attachment) => {
    let url = '/customers/' + urnToRef(this.props.customer_urn) + '/attachments';
    let data = {
      filename: attachment.file.name,
      s3_key: attachment.s3Key
    };
    await post(url, data);
  };

  getSignedUrl = async() => {
    let url = 'uploads/signed_s3_upload_url';
    const data = { uploadType: 'Attachment' };
    return await post(url, data);
  };

  addAttachments = (files) => {
    const attachments = files.map((file, idx) => {
      return {
        file: file,
        s3Key: '',
        index: idx,
        inS3: false,
        uploadInProgress: false
      };
    });

    this.setState({ attachments });
  };

  createImageFile = (blob, origFile) => {
    const newFile = new File(
      [blob], origFile.name, { type: origFile.type }
    );
    // Copy properties from the original file
    const props = ["upload", "status", "previewElement", "previewTemplate", "accepted"];
    $.each(props, (i, p) => {
      newFile[p] = origFile[p];
    });
    return newFile;
  };

  // eslint-disable-next-line max-params
  resizeImageFile = (image, file, width, height, callback) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob(blob => {
      callback(this.createImageFile(blob, file));
    }, file.type);
  };

  processFileIfRequired = (file, index) => {
    const MAX_IMAGE_DIMENSION = 3000;

    if (file.type.indexOf('image') < 0) { return; }

    let reader = new FileReader();

    reader.addEventListener("load", event => {
      let origImg = new Image();
      origImg.src = event.target.result;
      origImg.addEventListener("load", e => {
        let width = e.target.width;
        let height = e.target.height;

        // Don't resize if below max dimensions
        if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
          return;
        }

        // Calculate new dimensions
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width *= ratio;
        height *= ratio;

        // Create new resized image and replace original.
        this.resizeImageFile(origImg, file, width, height, resizedFile => {
          let attachments = this.state.attachments;
          attachments[index].file = resizedFile;
          this.setState({ attachments });
        });
      });
    });

    reader.readAsDataURL(file);
  };

  processFiles = (files) => {
    files.forEach((file, idx) => this.processFileIfRequired(file, idx));
  };

  onDrop = (files) => {
    this.processFiles(files);
    this.addAttachments(files);
  };

  uploadAttachments = () => {
    this.state.attachments.forEach(async(a) => {
      if (!a.uploadInProgress && !a.inS3) {
        let attachments = this.state.attachments;
        attachments[a.index].uploadInProgress = true;
        this.setState({ attachments });
        let signedUrlResp = await this.getSignedUrl(a);
        this.uploadToS3(a, signedUrlResp);
      }
    });
  };

  /**
   * Give a rough approximation
   * of file size just to display
   * to user
   * Capped at MB
   */
  convertSize = (fileSize) => {

    let units = ['B', 'KB', 'MB'];

    let returnVal = fileSize;
    let index = 0;
    while (returnVal > 1000 && index < 3) {
      returnVal = Math.round((returnVal / 1000));
      index++;
    }

    return returnVal + units[index];
  };

  uploadStatus = (index) => {
    let attachment = this.state.attachments[index];
    let inS3 = attachment.inS3;
    let uploadInProgress = attachment.uploadInProgress;

    if (uploadInProgress) {
      return <span><img src={ window.knockout_assets['banco/throbber_32x32_transparent.gif'] }/>
      </span>;
    } else if (inS3) {
      return <span style={ { color: "#5cb85c" } }
        className="glyphicon glyphicon-ok tableRowUploaded"/>;
    } else {
      return <span style={ { color: "#d9534f" } }
        className="glyphicon glyphicon-remove tableRowUploaded"/>;
    }
  };

  render() {

    let table =
      <ReactTable
        data = { this.state.attachments }
        showPageSizeOptions={ false }
        defaultPageSize={ 4 }
        className='-striped -highlight'
        columns={ [
          {
            Header: 'File Name',
            accessor: 'file.name',
            Cell: ({ row }) => (row['file.name'])
          },
          {
            Header: 'File Size',
            accessor: 'file.size',
            Cell: ({ row }) => (this.convertSize(row['file.size'])),
            className: styles.uploaderTableCenter
          },
          {
            Header: 'Uploaded',
            accessor: 'index',
            Cell: ({ row }) => (this.uploadStatus(row.index)),
            className: styles.uploaderTableCenter
          }
        ] }>
      </ReactTable>;

    return (
      <div className="modal-content">
        <Modal.Header>
          <button type="button" className="close" onClick={ this.destroy } aria-hidden="true">
            &times;
          </button>
          <div className="vertical-align-middle-children">
            <h1 className="inline">Upload Attachment for { this.props.customer_name }</h1>
          </div>
        </Modal.Header>

        <br/>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-5">
              <Dropzone onDrop={ this.onDrop }>
              </Dropzone>
            </div>
            <div className="col-md-7">
              { table }
            </div>
          </div>
        </div>
        <br/>

        <Modal.Footer>
          <div className="left" style={ { textAlign: "left" } }>
            Drag files into the area above, or click to choose. Click upload to upload all files.
            <br/>Large images will be re-sized automatically.</div>
          <div className="right">
            <button
              type="button"
              data-fb-button="Upload Attachment"
              onClick={ this.uploadAttachments }
              className="btn btn-success">
              Upload
            </button>
          </div>
        </Modal.Footer>
      </div>
    );
  }
}

AttachmentUploaderModal.defaultProps = {
  customer_urn: "",
  customer_name: ""
};

AttachmentUploaderModal.propTypes = {
  customer_urn: PropTypes.string,
  customer_name: PropTypes.string
};

export default AttachmentUploaderModal;
