import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search,
} from "lucide-react";

import "../../styles/teamLeadHelp.css";

function TeamLeadHelp() {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

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

  const recentPosts = [
    "Settings: Idle and timeout",
    "What do I need to set up to get started with premium (employee monitoring) version?",
    "What does Handdy monitor on my computer?",
    "How frequently does the desktop timer synchronize with the website?",
    "What can I track?",
  ];

  const commonQuestions = [
    "How do I subscribe to premium version?",
    "What does Handdy monitor on my computer?",
    "For how long will Handdy be free?",
    "Why is Handdy free?",
    "How do I view what I am subscribed to?",
    "Privacy and data security concerns for employees who use Handdy.",
  ];

  const searchableItems = [
      ...categories.map((item) => item.title),
      ...recentPosts,
      ...commonQuestions,
    ];

  const suggestions = (() => {
    const text = searchText.trim().toLowerCase();

    if (!text) {
      return [];
    }

    return searchableItems
      .filter((item) =>
        item.toLowerCase().includes(text)
      )
      .slice(0, 6);
  })();

  const handleSearch = () => {
    if (suggestions[0]) setSearchText(suggestions[0]);
  };

  return (
    <div className="tl-help-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="tl-help-header">

        <div className="tl-help-header-inner">

          {/* LOGO */}
          <button
            type="button"
            className="tl-help-logo"
            onClick={() =>
              navigate("/team-lead/dashboard")
            }
          >
            <div className="tl-help-logo-circle">
              ♙
            </div>

            <span>
              Handdy
            </span>
          </button>

          {/* NAV */}
          <nav className="tl-help-nav">

            <button
              type="button"
              onClick={() =>
                navigate("/team-lead/dashboard")
              }
            >
              HOME
            </button>

            {/* FEATURES */}
            <div className="tl-help-menu-wrapper">

              <button
                type="button"
                className="tl-help-menu-button"
                onClick={() => {
                  setFeaturesOpen(
                    (previous) => !previous
                  );

                  setContactOpen(false);
                }}
              >
                FEATURES

                <ChevronDown size={18} />
              </button>

              {featuresOpen && (
                <div className="tl-help-dropdown tl-help-features-dropdown">

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
            <div className="tl-help-menu-wrapper">

              <button
                type="button"
                className="tl-help-menu-button"
                onClick={() => {
                  setContactOpen(
                    (previous) => !previous
                  );

                  setFeaturesOpen(false);
                }}
              >
                CONTACT US

                <ChevronDown size={18} />
              </button>

              {contactOpen && (
                <div className="tl-help-dropdown tl-help-contact-dropdown">

                  <button type="button">
                    About us
                  </button>

                  <button type="button">
                    Contact us
                  </button>

                </div>
              )}

            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/login")
              }
            >
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

      <section className="tl-help-search-section">

        <div className="tl-help-search-box">

          <div className="tl-help-search-input-wrapper">

            <input
              type="text"
              placeholder="Type your keyword slowly and select from the drop down ..."
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            {suggestions.length > 0 && (
              <div className="tl-help-suggestions">

                {suggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setSearchText(
                          suggestion
                        );
                      }}
                    >
                      {suggestion}
                    </button>
                  )
                )}

              </div>
            )}

          </div>

          <button
            type="button"
            className="tl-help-search-button"
            onClick={handleSearch}
          >
            <Search size={18} />

            SEARCH
          </button>

        </div>

      </section>

      {/* =====================================
          MAIN
      ===================================== */}

      <main className="tl-help-main">

        <div className="tl-help-left">

          {/* CATEGORIES */}

          <section className="tl-help-section">

            <h1>
              Categories
            </h1>

            <div className="tl-help-divider" />

            <div className="tl-help-categories">

              {categories.map(
                (category) => (
                  <article
                    key={category.title}
                    className="tl-help-category"
                  >

                    <button type="button">
                      {category.title}
                    </button>

                    <p>
                      {category.description}
                    </p>

                  </article>
                )
              )}

            </div>

          </section>

          {/* COMMON QUESTIONS */}

          <section className="tl-help-section tl-help-common-section">

            <h1>
              Answers to most common questions
            </h1>

            <div className="tl-help-divider" />

            <div className="tl-help-common-grid">

              {commonQuestions.map(
                (question) => (
                  <button
                    type="button"
                    key={question}
                    className="tl-help-question"
                  >
                    {question}
                  </button>
                )
              )}

            </div>

          </section>

        </div>

        {/* =====================================
            RIGHT SIDEBAR
        ===================================== */}

        <aside className="tl-help-right">

          <div className="tl-help-side-card">

            <h2>
              Recent Posts
            </h2>

            <div className="tl-help-side-list">

              {recentPosts.map(
                (post) => (
                  <button
                    type="button"
                    key={post}
                  >
                    {post}
                  </button>
                )
              )}

            </div>

          </div>

          <div className="tl-help-side-card tl-help-category-card">

            <h2>
              Categories
            </h2>

            <div className="tl-help-side-list">

              {categories.map(
                (category) => (
                  <button
                    type="button"
                    key={category.title}
                  >
                    {category.title}
                  </button>
                )
              )}

            </div>

          </div>

        </aside>

      </main>

      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="tl-help-footer">

        <span>
          Need more help?
        </span>

        <a href="mailto:support@upsilonservices.com">
          Email us
        </a>

        <span>
          and we will reply back
        </span>

      </footer>

    </div>
  );
}

export default TeamLeadHelp;
