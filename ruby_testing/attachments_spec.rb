# frozen_string_literal: true

require 'spec_helper'

describe 'Attachments' do
  include CustomersSupport

  context 'as an underwriter', user: 'almighgo' do
    it 'allows upload of files from all call sites' do
      app_urn = setup_loan_application(applicant_data: random_loan_application_data)[:urn]
      select_loan_application(app_urn.to_ref)

      file_count = 0

      %w[attachment_table dropdown customer_screen].each do |c|
        open_attachment_uploader_modal(c, app_urn)
        upload_file
        assert_file_uploaded(file_count += 1)
      end
    end
  end

  def open_app_comm_tab
    find("a", text: "Applicant Communication", exact_text: true).click
  end

  def open_attachment_uploader_modal(context, app_urn)
    case context
    when "attachment_table"
      open_app_comm_tab
      find("a", text: "Add Attachment...", exact_text: true).click
    when "dropdown"
      select_loan_application(app_urn.to_ref)
      first(:fb_button, 'PartyActionDropdown').click
      find_a_text('Add Attachment...').click
    when "customer_screen"
      select_loan_application(app_urn.to_ref)
      within(find_customer_modal_panel) do
        find(:fb_button, 'Add Attachment').click
      end
    end
  end

  def upload_file
    tmp_file_path = File.absolute_path(create_tmp_file.path)
    puts "uploading file #{tmp_file_path}"
    find('input[type="file"]', visible: false).set(tmp_file_path)
    find(:fb_button, 'Upload Attachment').click
  end

  def create_tmp_file
    rand = SecureRandom.hex(10)
    Tempfile.new(rand + '.txt').tap do |file|
      file.write(rand)
      file.close
    end
  end

  def assert_file_uploaded(file_count)
    open_app_comm_tab
    attachment_table = find(:fb_table, 'AttachmentTable')
    expect(attachment_table).to have_css('tr', count: file_count)
  end
end
