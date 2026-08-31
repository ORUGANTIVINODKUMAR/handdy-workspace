import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import "../../styles/employeeHelp.css";

function EmployeeHelp() {
  const [search, setSearch] = useState("");

  const [featuresOpen, setFeaturesOpen] =
    useState(false);

  const [contactOpen, setContactOpen] =
    useState(false);

  const categories = [
    {
      title: "Initial set up questions",
      description:
        "View all answers for questions under this category",
    },
    {
      title: "Manage section",
      description:
        "View all answers for questions under this category",
    },
    {
      title: "Settings",
      description:
        "View all answers for questions under this category",
    },
    {
      title: "Reports",
      description:
        "View all answers for questions under this category",
    },
    {
      title: "Timer",
      description:
        "View all answers for questions under this category",
    },
    {
      title: "Answer to more questions",
      description:
        "View all answers for questions under this category",
    },
  ];

  const commonQuestions = [
    "How do I subscribe to premium version?",
    "What does Handdy monitor on my computer?",
    "For how long will Handdy be free?",
    "Why is Handdy free?",
    "How do I view what I am subscribed to?",
    "Privacy and data security concerns for employees who use Handdy.",
  ];

  const recentPosts = [
    "Settings: Idle and timeout",
    "What do I need to set up to get started with premium (employee monitoring) version?",
    "What does Handdy monitor on my computer?",
    "How frequently does the desktop timer synchronize with the website?",
    "What can I track?",
  ];

  const filteredQuestions = commonQuestions.filter((question) =>
    question.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSearch = () => {
    setSearch((value) => value.trim());
  };

  return (
    <div className="employee-help-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="employee-help-header">

        <div className="employee-help-header-inner">

          {/* LOGO */}
          <button
            type="button"
            className="employee-help-logo"
          >
            <div className="employee-help-logo-circle">
              ♙
            </div>

            <span>
              Handdy
            </span>
          </button>


          {/* NAV */}
          <nav className="employee-help-nav">

            <button type="button">
              HOME
            </button>


            {/* FEATURES */}
            <div className="employee-help-menu-wrapper">

              <button
                type="button"
                className="employee-help-menu-button"
                onClick={() => {
                  setFeaturesOpen(
                    (previous) => !previous
                  );

                  setContactOpen(false);
                }}
              >
                FEATURES

                <ChevronDown size={17} />
              </button>

              {featuresOpen && (
                <div className="employee-help-dropdown employee-help-features-dropdown">

                  <button type="button">
                    Employee monitoring
                  </button>

                  <button type="button">
                    Employee time and attendance
                  </button>

                  <button type="button">
                    Employee productivity analytics
                  </button>

                </div>
              )}

            </div>


            <button type="button">
              PRICING
            </button>


            {/* CONTACT */}
            <div className="employee-help-menu-wrapper">

              <button
                type="button"
                className="employee-help-menu-button"
                onClick={() => {
                  setContactOpen(
                    (previous) => !previous
                  );

                  setFeaturesOpen(false);
                }}
              >
                CONTACT US

                <ChevronDown size={17} />
              </button>

              {contactOpen && (
                <div className="employee-help-dropdown employee-help-contact-dropdown">

                  <button type="button">
                    About us
                  </button>

                  <button type="button">
                    Contact us
                  </button>

                </div>
              )}

            </div>


            <button type="button">
              LOGIN
            </button>

            <button type="button">
              SIGNUP NOW
            </button>

          </nav>

        </div>

      </header>


      {/* =====================================
          SEARCH HERO
      ===================================== */}

      <section className="employee-help-search-section">

        <div className="employee-help-search-box">

          <div className="employee-help-search-input-wrapper">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Type your keyword slowly and select from the drop down ..."
            />

          </div>

          <button
            type="button"
            className="employee-help-search-button"
            onClick={handleSearch}
          >
            <Search size={17} />

            SEARCH
          </button>

        </div>

      </section>


      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <div className="employee-help-main">

        {/* LEFT SIDE */}
        <main className="employee-help-left">

          {/* CATEGORIES */}
          <section className="employee-help-section">

            <h1>
              Categories
            </h1>

            <div className="employee-help-divider" />

            <div className="employee-help-categories">

              {categories.map((category) => (
                <div
                  key={category.title}
                  className="employee-help-category"
                >
                  <button type="button">
                    {category.title}
                  </button>

                  <p>
                    {category.description}
                  </p>
                </div>
              ))}

            </div>

          </section>


          {/* COMMON QUESTIONS */}
          <section className="employee-help-section employee-help-common-section">

            <h1>
              Answers to most common questions
            </h1>

            <div className="employee-help-divider" />

            <div className="employee-help-common-grid">

              {filteredQuestions.map(
                (question) => (
                  <button
                    key={question}
                    type="button"
                    className="employee-help-question"
                  >
                    {question}
                  </button>
                )
              )}

            </div>

          </section>

        </main>


        {/* =================================
            RIGHT SIDEBAR
        ================================= */}

        <aside className="employee-help-right">

          {/* RECENT POSTS */}
          <section className="employee-help-side-card">

            <h2>
              Recent Posts
            </h2>

            <div className="employee-help-side-list">

              {recentPosts.map((post) => (
                <button
                  key={post}
                  type="button"
                >
                  {post}
                </button>
              ))}

            </div>

          </section>


          {/* CATEGORIES */}
          <section className="employee-help-side-card">

            <h2>
              Categories
            </h2>

            <div className="employee-help-side-list">

              {categories.map((category) => (
                <button
                  key={category.title}
                  type="button"
                >
                  {category.title}
                </button>
              ))}

            </div>

          </section>

        </aside>

      </div>


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="employee-help-footer">

        <div className="employee-help-contact-footer">

          <span>
            Need more help?
          </span>

          <a href="mailto:info@upsilonservices.com">
            Email us
          </a>

          <span>
            and we will reply back
          </span>

        </div>

        <div className="employee-help-copyright">

          © Employee monitoring and productivity software – Handdy.
          All rights reserved

        </div>

      </footer>

    </div>
  );
}

export default EmployeeHelp;
