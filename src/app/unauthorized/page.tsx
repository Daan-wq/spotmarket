import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function UnauthorizedPage() {
  const t = await getTranslations("unauthorized");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("title")}</h1>
        <p className="text-gray-600 mb-6">
          {t("description")}
        </p>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 text-sm underline"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
