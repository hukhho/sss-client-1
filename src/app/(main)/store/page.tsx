import { Metadata } from "next"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Cửa hàng",
  description: "Khám phá sản phẩm.",
}

export default function StorePage() {
  return <StoreTemplate />
}
