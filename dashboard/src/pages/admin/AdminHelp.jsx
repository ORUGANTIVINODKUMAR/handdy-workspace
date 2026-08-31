import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import "../../styles/adminHelp.css";

function AdminHelp() {
  const [search, setSearch] = useState("");

  const categories = [
    {
      title: "Initial set up questions",
      description: "View all answers for questions under this category",
    },
    {
      title: "Manage section",
      description: "View all answers for questions under this category",
    },
    {
      title: "Settings",
      description: "View all answers for questions under this category",
    },
    {
      title: "Reports",
      description: "View all answers for questions under this category",
    },
    {
      title: "Timer",
      description: "View all answers for questions under this category",
    },
    {
      title: "Answer to more questions",
      description: "View all answers for questions under this category",
    },
  ];

  const questions = [
    "How do I subscribe to premium version?",
    "What does TimeTrack monitor on my computer?",
    "For how long will TimeTrack be free?",
    "Why is TimeTrack free?",
    "How do I view what I am subscribed to?",
    "Privacy and data security concerns for employees who use TimeTrack.",
  ];

  const recentPosts = [
    "Settings: Idle and timeout",
    "What do I need to set up to get started with employee monitoring?",
    "What does TimeTrack monitor on my computer?",
    "How frequently does the desktop timer synchronize with the website?",
    "What can I track?",
  ];

  const filteredQuestions = (() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return questions;
    }

    return questions.filter((question) =>
      question.toLowerCase().includes(value)
    );
  })();

  return (
    <DashboardLayout title="Help">
      <section className="admin-help-page">

        {/* SEARCH AREA */}
        <div className="help-search-section">
          <div className="help-search-box">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Type your keyword slowly and search..."
            />

            <button type="button">
              SEARCH
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="help-content-layout">

          {/* LEFT */}
          <div className="help-main-content">

            {/* CATEGORIES */}
            <section className="help-section">
              <h2>Categories</h2>

              <div className="help-category-grid">
                {categories.map((category) => (
                  <button
                    type="button"
                    className="help-category-card"
                    key={category.title}
                  >
                    <strong>{category.title}</strong>
                    <span>{category.description}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* QUESTIONS */}
            <section className="help-section help-common-section">
              <h2>Answers to most common questions</h2>

              <div className="help-question-grid">
                {filteredQuestions.length === 0 ? (
                  <p className="help-no-results">
                    No questions found.
                  </p>
                ) : (
                  filteredQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="help-question"
                    >
                      {question}
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="help-sidebar-panel">

            <div className="help-side-card">
              <h2>Recent Posts</h2>

              <div className="help-side-links">
                {recentPosts.map((post) => (
                  <button
                    key={post}
                    type="button"
                  >
                    {post}
                  </button>
                ))}
              </div>
            </div>

            <div className="help-side-card">
              <h2>Categories</h2>

              <div className="help-side-links">
                {categories.map((category) => (
                  <button
                    key={category.title}
                    type="button"
                  >
                    {category.title}
                  </button>
                ))}
              </div>
            </div>

          </aside>
        </div>

        {/* FOOTER */}
        <footer className="help-footer">
          <p>
            Need more help?{" "}
            <a href="mailto:support@company.com">
              Email us
            </a>{" "}
            and we will reply back
          </p>

          <p>
            © 2026 TimeTrack. All rights reserved.
          </p>
        </footer>
      </section>
    </DashboardLayout>
  );
}

export default AdminHelp;
