"use client"

import { useAccount } from "@lib/context/account-context"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfilePassword from "@modules/account/components/profile-password"
import ProfileBillingAddress from "../components/profile-billing-address"
import ProfilePhone from "../components/profile-phone"
import { useAdminCustomQuery, useProducts } from "medusa-react"

type Product = {
  id: string
  title: string
}
type AdminDeposit = {
  id: string,
  user_id: string,
}
type AdminDepositQuery = {

  expand?: string,
  fields?: string
}
type AdminDepositRes = {
  deposits: AdminDeposit[],
}

const ProfileTemplate = () => {
  const { customer, retrievingCustomer, refetchCustomer } = useAccount()
  const { data, isLoading } = useAdminCustomQuery<
    AdminDepositQuery,
    AdminDepositRes
  >(
    `/custom/test`, // path
    ["deposits", "list"], // queryKey
    {}
  )
  console.log("data", data)
  if (retrievingCustomer || !customer) {
    return null
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Profile</h1>
        <p className="text-base-regular">
          {isLoading && <span>Loading...</span>}
          {data && data.deposits && (
            <span>
              {data.deposits.map((deposit: any, index: any) => (
                <span key={index}>{deposit.id}</span>
              ))}
            </span>
          )}
          View and update your profile information, including your name, email,
          and phone number. You can also update your billing address, or change
          your password.
        </p>
      </div>
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        <ProfilePassword customer={customer} />
        <Divider />
        <ProfileBillingAddress customer={customer} />
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}

export default ProfileTemplate
