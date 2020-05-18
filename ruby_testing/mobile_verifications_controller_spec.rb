# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Mobile Verifications Controller', type: :request do
  it 'creates and sends the mobile code' do
    modal_integration = create(:modal_integration)
    headers = {
      'CONTENT_TYPE' => 'application/json',
      'X-Toshi-Client-Api-Key' => modal_integration.key
    }
    params = json_data(file_name: 'mobile_verification_send_request_body')
    params_json = params.to_json

    expect(
      Services::Messages::Sms::OrderVerificationMessenger
    ).to(
      receive(:create_and_send_verification_sms)
    )
    post '/api/v2/verification/send', params: params_json, headers: headers

    expect(response).to have_http_status(:ok)
  end

  it 'it responds true if a verification code is valid' do
    modal_integration = create(:modal_integration)
    verification_code = create(:mobile_verification_code)

    headers = {
      'CONTENT_TYPE' => 'application/json',
      'X-Toshi-Client-Api-Key' => modal_integration.key
    }
    params = json_data(file_name: 'mobile_verification_verify_request_body')
    params[:client_code] = verification_code.client_code
    params[:confirmation_code] = verification_code.confirmation_code
    params_json = params.to_json

    post '/api/v2/verification/verify', params: params_json, headers: headers

    expect(response).to have_http_status(:ok)
    response_hash = JSON.parse(response.body)
    expect(response_hash['verified']).to eq(true)
  end

  it 'it responds false if a verification code is invalid' do
    modal_integration = create(:modal_integration)
    verification_code = create(:mobile_verification_code)

    headers = {
      'CONTENT_TYPE' => 'application/json',
      'X-Toshi-Client-Api-Key' => modal_integration.key
    }
    params = json_data(file_name: 'mobile_verification_verify_request_body')
    params[:client_code] = verification_code.client_code
    params[:confirmation_code] = '12345wrong'
    params_json = params.to_json

    post '/api/v2/verification/verify', params: params_json, headers: headers

    expect(response).to have_http_status(:ok)
    response_hash = JSON.parse(response.body)
    expect(response_hash['verified']).to eq(false)
  end
end
