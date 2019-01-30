# frozen_string_literal: true

class SubjectAccessRequest < ActiveRecord::Base
  include NotesHelper

  has_identity prefix: :SR
  belongs_to :customer, inverse_of: :subject_access_requests

  STATUSES = Banco.collection_value_constants(self, %i[pending generated])

  SAR_BUCKET_NAME = Banco::Environments::AWS.subject_access_requests_bucket
  KMS_KEY_ALIAS = "alias/#{::Rails.env}_subject_access_requests_kms_key"

  SAR_DOWNLOAD_LINK_EXPIRY_TIME = 5.minutes.to_i

  state_machine :status, initial: PENDING do
    event :generate do
      transition PENDING => GENERATED
    end

    before_transition any => GENERATED do |sar|
      sar.generate_subject_access_request(SAR_BUCKET_NAME, sar.customer.ref)
      sar.save!
      sar.save_note!(
        content: "Subject Access Request generated for customer: #{sar.customer.ref}",
        tag_resources: [sar, sar.customer],
        perform: 'Subject Access Request Generated',
        principal: Banco::Rails::OAuth::Principal.new(sar.created_by, nil)
      )
    end
  end

  broadcasts_update(&:urn)

  def generate_subject_access_request(bucket_name, customer_ref)
    customer = Customer.find_by_identifier!(customer_ref)

    Dir.mktmpdir('temp') do |dir|
      Dir.chdir(dir) do
        base_name = "SAR_#{customer_ref}_#{Time.current.strftime('%Y%m%d%H%M%S')}.zip"
        zip_file_name = File.join(Dir.pwd, base_name)
        SubjectAccessRequestHelper.generate_subject_access_request_zip(customer, zip_file_name)
        StorageHelper.save(
          bucket_name,
          base_name,
          IO.binread(zip_file_name),
          kms_key_alias: KMS_KEY_ALIAS
        )
        self.object_name = base_name
      end
    end
  end

  def download_link
    return unless object_name.present?
    StorageHelper.download_link(SAR_BUCKET_NAME, object_name, SAR_DOWNLOAD_LINK_EXPIRY_TIME)
  end
end
