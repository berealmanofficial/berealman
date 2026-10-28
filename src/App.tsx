import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout";
import { HomePage } from "./pages/HomePage";
import { ArticlesPage } from "./pages/ArticlesPage";
import { ArticleDetailPage } from "./pages/ArticleDetailPage";
import { CategoriesPage, CategoryPage } from "./pages/CategoriesPage";
import { SearchPage } from "./pages/SearchPage";
import { PremiumPage, PreviewPage } from "./pages/PremiumPages";
import { VideosPage, VideoDetailPage, AdminVideoFormPage } from "./pages/VideosPages";
import { CoursesPage, CourseDetailPage } from "./pages/CoursesPages";
import { AdminCoursesPage, AdminCourseDetailPage } from "./pages/AdminCoursesPages";
import { CheckoutPage } from "./pages/CheckoutPage";
import { AdminPaymentsPage } from "./pages/AdminPaymentsPage";
import { BooksPage, BookDetailPage } from "./pages/BooksPages";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ApplyPage, SamplePage, MyArticlesPage, ArticleEditorPage, AdminWritersPage } from "./pages/WriterPages";
import {
  AboutPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
  AuthorRulesPage,
  FaqPage,
  NotFoundPage,
} from "./pages/StaticPages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:slug" element={<ArticleDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/preview/:slug" element={<PreviewPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/:slug" element={<VideoDetailPage />} />
          <Route path="/admin/videos" element={<AdminVideoFormPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/courses/:slug" element={<AdminCourseDetailPage />} />
          <Route path="/checkout/:type/:slug" element={<CheckoutPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:slug" element={<BookDetailPage />} />
          <Route path="/writers/apply" element={<ApplyPage />} />
          <Route path="/writers/sample" element={<SamplePage />} />
          <Route path="/writers/articles" element={<MyArticlesPage />} />
          <Route path="/writers/articles/new" element={<ArticleEditorPage />} />
          <Route path="/writers/articles/:id" element={<ArticleEditorPage />} />
          <Route path="/admin/writers" element={<AdminWritersPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/author-rules" element={<AuthorRulesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
