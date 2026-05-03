import { redirect } from "next/navigation";

export const metadata = {
  title: "Course",
};

export default function CourseHubPage() {
  redirect("/creator/course/foundations");
}
