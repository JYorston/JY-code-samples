# frozen_string_literal: true

module Api
  module V2
    class MobileVerificationsController < ApiController
      protect_from_forgery with: :null_session

      def generate_and_send_mobile_auth_code
        unless Api::V2::ControllerHelperMethods.api_key_valid?(request)
          render Api::V2::ControllerHelperMethods.error_json_body(Constants::BAD_API_KEY)
          return
        end

        to_number = Services::Messages::PhoneValidatorService.format_phone_number(
          params.fetch(:to_number)
        )
        client_code = params.fetch(:client_code)
        confirmation_code = SecureRandom.random_number(10**4).to_s.rjust(4, '0')

        Services::Messages::Sms::OrderVerificationMessenger.create_and_send_verification_sms(
          to_number,
          client_code,
          confirmation_code
        )

        render json: { sent: true }, status: :ok
      end

      def verify
        unless Api::V2::ControllerHelperMethods.api_key_valid?(request)
          render Api::V2::ControllerHelperMethods.error_json_body(Constants::BAD_API_KEY)
          return
        end

        client_code = params.fetch(:client_code)
        user_entered_confirm_code = params.fetch(:confirmation_code)

        mvc = MobileVerificationCode.find_by(client_code: client_code)

        verified = user_entered_confirm_code == mvc.confirmation_code

        render json: { verified: verified }, status: :ok
      end
    end
  end
end
