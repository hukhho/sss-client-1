import { useCheckout } from "@lib/context/checkout-context"
import { PaymentSession, StorePostCartsCartReq } from "@medusajs/medusa"
import Button from "@modules/common/components/button"
import Spinner from "@modules/common/icons/spinner"
import { OnApproveActions, OnApproveData } from "@paypal/paypal-js"
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { useCart } from "medusa-react"
import React, { useEffect, useState } from "react"
import axios from "axios"
import { ReturnQueryFromVNPayDTO, VNPay } from 'vnpay';
import Medusa from "@medusajs/medusa-js"


type PaymentButtonProps = {
  paymentSession?: PaymentSession | null
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ paymentSession }) => {
  const [notReady, setNotReady] = useState(true)
  const { cart } = useCart()

  useEffect(() => {
    setNotReady(true)

    if (!cart) {
      return
    }

    if (!cart.shipping_address) {
      return
    }

    if (!cart.billing_address) {
      return
    }

    if (!cart.email) {
      return
    }

    if (cart.shipping_methods.length < 1) {
      return
    }

    setNotReady(false)
  }, [cart])

  switch (paymentSession?.provider_id) {
    case "stripe":
      return (
        <StripePaymentButton session={paymentSession} notReady={notReady} />
      )
    case "vn-pay":
      return (
        <VNPayTestPaymentButton session={paymentSession} notReady={notReady} />
      )
    case "manual":
      return <ManualTestPaymentButton notReady={notReady} />
    case "paypal":
      return (
        <PayPalPaymentButton notReady={notReady} session={paymentSession} />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

const StripePaymentButton = ({
  session,
  notReady,
}: {
  session: PaymentSession
  notReady: boolean
}) => {
  const [disabled, setDisabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  )

  const { cart } = useCart()
  const { onPaymentCompleted } = useCheckout()

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("cardNumber")

  useEffect(() => {
    if (!stripe || !elements) {
      setDisabled(true)
    } else {
      setDisabled(false)
    }
  }, [stripe, elements])

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address.first_name +
              " " +
              cart.billing_address.last_name,
            address: {
              city: cart.billing_address.city ?? undefined,
              country: cart.billing_address.country_code ?? undefined,
              line1: cart.billing_address.address_1 ?? undefined,
              line2: cart.billing_address.address_2 ?? undefined,
              postal_code: cart.billing_address.postal_code ?? undefined,
              state: cart.billing_address.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <>
      <Button
        disabled={submitting || disabled || notReady}
        onClick={handlePayment}
      >
        {submitting ? <Spinner /> : "Checkout"}
      </Button>
      {errorMessage && (
        <div className="text-red-500 text-small-regular mt-2">
          {errorMessage}
        </div>
      )}
    </>
  )
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ""

const PayPalPaymentButton = ({
  session,
  notReady,
}: {
  session: PaymentSession
  notReady: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  )

  const { cart } = useCart()
  const { onPaymentCompleted } = useCheckout()

  const handlePayment = async (
    _data: OnApproveData,
    actions: OnApproveActions
  ) => {
    actions?.order
      ?.authorize()
      .then((authorization) => {
        if (authorization.status !== "COMPLETED") {
          setErrorMessage(`An error occurred, status: ${authorization.status}`)
          return
        }
        onPaymentCompleted()
      })
      .catch(() => {
        setErrorMessage(`An unknown error occurred, please try again.`)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }
  return (
    <PayPalScriptProvider
      options={{
        "client-id": PAYPAL_CLIENT_ID,
        currency: cart?.region.currency_code.toUpperCase(),
        intent: "authorize",
      }}
    >
      {errorMessage && (
        <span className="text-rose-500 mt-4">{errorMessage}</span>
      )}
      <PayPalButtons
        style={{ layout: "horizontal" }}
        createOrder={async () => session.data.id as string}
        onApprove={handlePayment}
        disabled={notReady || submitting}
      />
    </PayPalScriptProvider>
  )
}

const VNPayTestPaymentButton = ({
  session,
  notReady,
}: {
  session: PaymentSession
  notReady: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  )

  const { cart } = useCart()
  const { updateCart } = useCart()

  const changeMetadata = async (context: any) => {
    await updateCart.mutateAsync({ context } as any)
  }

  const { onPaymentCompleted } = useCheckout()

  const openPaymentWindow = async (paymentUrl: URL, cartId: string) => {
    const width = 600 // Set the width of the popup window
    const height = 400 // Set the height of the popup window
    const left = (window.innerWidth - width) / 2
    const top = (window.innerHeight - height) / 2

    await changeMetadata({ paymentUrl: paymentUrl })

    const popupWindow = window.open(
      paymentUrl,
      "_blank",
      `width=${width},height=${height},left=${left},top=${top}`
    )
    
    if (popupWindow) {
      const checkPopupStatus = setInterval(async () => {
        if (!popupWindow || popupWindow.closed) {
          clearInterval(checkPopupStatus)

          await changeMetadata({ cac: "cac" })
          // You can perform any necessary actions when the payment window is closed.
          // For example, you can check the payment status.
          // After processing, you can call onPaymentCompleted() if the payment was successful.
          console.log("before onPaymentCompleted")
          const medusa = new Medusa({ baseUrl: "http://localhost:9000", maxRetries: 3 })
          await medusa.carts.retrieve(cartId)
            .then(({ cart }: { cart: any }) => {
              console.log("cart", cart)
              console.log("(cart.context as { vnpay: { verifyResult?: { isSuccess: boolean } } }).vnpay?.verifyResult", (cart.context as { vnpay: { verifyResult?: { isSuccess: boolean } } }).vnpay?.verifyResult);

              if ((cart.context as { vnpay: { verifyResult?: { isSuccess: boolean } } }).vnpay?.verifyResult?.isSuccess === true) {
                console.log("Payment success");
                onPaymentCompleted();

              }

            }).catch((err) => {
              console.log("err", err)
            });

          console.log("after onPaymentCompleted")
        }
      }, 1000)
    } else {
      setErrorMessage("Unable to open payment popup. Please enable pop-ups.")
    }
  }

  const handlePayment = async () => {
    console.log("handlePayment")

    console.log("session", session)
    console.log("cart", cart)

    setSubmitting(true)

    if (!cart) {
      setSubmitting(false)
      return
    }

    try {
      // Create instance
      const vnpayInstance = new VNPay({
        paymentGateway: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", //your payment gateway, default is sandbox
        tmnCode: "QH1923CV", // your tmn code
        secureSecret: "ECVJJJFHCHKUIMBWJMZSJBFQRVZSKQNK", // your secure secret
        returnUrl: "http://localhost:9000/payment/vnpay", // return url
      })
      // Get the current timestamp
      const timestamp = new Date().toISOString();

      // Log the timestamp using console.log
      console.log("Timestamp:", timestamp);

      const tnx = cart.id + "-" + timestamp

      // Build payment url
      const urlString = await vnpayInstance.buildPaymentUrl({
        vnp_Amount: cart.total as number, // amount in VND
        vnp_IpAddr: "192.168.0.1", // customer ip address
        vnp_TxnRef: tnx, // your transaction reference
        vnp_OrderInfo: `Thanh toan cho ma GD: ${tnx}`,
      })
      console.log("urlString", urlString)
      if (urlString) {
        openPaymentWindow(urlString as unknown as URL, cart.id)
      } else {
        setErrorMessage("Payment URL not found in the response.")
      }
    } catch (error) {
      setErrorMessage(
        "An error occurred while processing the payment. " + error
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      hello
      <Button disabled={submitting || notReady} onClick={handlePayment}>
        {submitting ? <Spinner /> : "Checkout"}
      </Button>
      {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
    </div>
  )
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false)

  const { onPaymentCompleted } = useCheckout()

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()

    setSubmitting(false)
  }

  return (
    <Button disabled={submitting || notReady} onClick={handlePayment}>
      {submitting ? <Spinner /> : "Checkout"}
    </Button>
  )
}

export default PaymentButton
