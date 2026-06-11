import Link from "next/link";
import Image from "next/image";
import { ChefHat } from "lucide-react";
import { IMAGES } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="font-display text-xl">SnackTrack</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SnackTrack. Eat well, effortlessly.
        </p>
      </div>

      {/* Art side */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src={IMAGES.freshTable}
          alt="A table of fresh, colorful ingredients"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
        <blockquote className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <p className="font-display text-3xl leading-snug text-balance">
            “The food you eat can be either the safest and most powerful form
            of medicine — or the slowest form of poison.”
          </p>
          <footer className="mt-4 text-sm text-white/75">— Ann Wigmore</footer>
        </blockquote>
      </div>
    </div>
  );
}
