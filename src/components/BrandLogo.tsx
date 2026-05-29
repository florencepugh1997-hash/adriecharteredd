import adrieLogo from "../assets/images/adrie.png";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export default function BrandLogo({ className = "h-11 w-auto object-contain", alt = "AdrieChartered" }: BrandLogoProps) {
  return <img src={adrieLogo} alt={alt} className={className} />;
}

export { adrieLogo };
