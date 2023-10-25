import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Home",
  description:
    "Thị trường giày cũ hàng đầu: Mua bán nhanh, an toàn, và tốt nhất cho tín đồ giày!",
}

const Home = () => {
  return (
    <>
      <Hero />
      <FeaturedProducts />
    </>
  )
}

export default Home
