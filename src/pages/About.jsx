import { useState } from "react";
import useAboutContent from "../hooks/useAboutContent";
import {
  ABOUT_CONTENT_ITEM_LIMIT,
  ABOUT_CONTENT_LIST_LIMIT,
  ABOUT_CONTENT_TEXT_LIMIT,
  ABOUT_CONTENT_TITLE_LIMIT,
  updateAboutContent,
} from "../lib/aboutContent";

const ABOUT_PAGE_TITLE = "동아리 소개";

function toFormValues(content) {
  return {
    intro: content.intro,
    activityTitle: content.activityTitle,
    activities: content.activities.join("\n"),
    websiteTitle: content.websiteTitle,
    websiteItems: content.websiteItems.join("\n"),
  };
}

function parseListInput(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function About({ isAdmin }) {
  const { content, setContent, isLoading, error, isFallbackData, markLiveData } =
    useAboutContent();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [formValues, setFormValues] = useState(() => toFormValues(content));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    setIsSubmitting(true);

    try {
      const nextContent = await updateAboutContent({
        intro: formValues.intro,
        activityTitle: formValues.activityTitle,
        activities: parseListInput(formValues.activities),
        websiteTitle: formValues.websiteTitle,
        websiteItems: parseListInput(formValues.websiteItems),
      });

      setContent(nextContent);
      markLiveData();
      setFormStatus({
        type: "success",
        text: "동아리 소개 내용을 저장했습니다.",
      });
    } catch (saveError) {
      setFormStatus({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "동아리 소개 내용을 저장하지 못했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <div className="container">
        <div className="videos-page-header about-page-header">
          <div className="videos-page-title about-page-title">
            <h2>{ABOUT_PAGE_TITLE}</h2>
            <p className="page-description">{content.intro}</p>
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="btn btn-dark videos-admin-toggle about-admin-toggle"
              onClick={() => {
                setFormStatus(null);
                setFormValues(toFormValues(content));
                setIsEditorOpen((current) => !current);
              }}
            >
              {isEditorOpen ? "소개 편집 닫기" : "소개 편집"}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="guestbook-server-note">
            {error}
            {isFallbackData ? " 기본 소개 문구를 먼저 보여주고 있습니다." : ""}
          </div>
        ) : null}

        {isLoading ? (
          <div className="guestbook-empty">동아리 소개 내용을 불러오는 중입니다.</div>
        ) : null}

        <div className="info-box">
          <h3>{content.activityTitle}</h3>
          <ul>
            {content.activities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="info-box">
          <h3>{content.websiteTitle}</h3>
          <ul>
            {content.websiteItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {isAdmin && isEditorOpen ? (
          <div className="schedule-panel">
            <div className="schedule-panel-head">
              <h3>소개 편집</h3>
              <span>{isFallbackData ? "기본 내용 표시 중" : "저장 가능"}</span>
            </div>

            <div className="schedule-admin-area">
              <form className="schedule-admin-form" onSubmit={handleSubmit}>
                <p className="schedule-field-hint">
                  동아리 소개 수정중...
                </p>

                <label className="guestbook-label" htmlFor="about-intro">
                  소개 문장
                </label>
                <textarea
                  id="about-intro"
                  rows="4"
                  maxLength={ABOUT_CONTENT_TEXT_LIMIT}
                  value={formValues.intro}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      intro: event.target.value,
                    }))
                  }
                ></textarea>

                <label className="guestbook-label" htmlFor="about-activity-title">
                  활동 섹션 제목
                </label>
                <input
                  id="about-activity-title"
                  type="text"
                  maxLength={ABOUT_CONTENT_TITLE_LIMIT}
                  value={formValues.activityTitle}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      activityTitle: event.target.value,
                    }))
                  }
                />

                <label className="guestbook-label" htmlFor="about-activities">
                  활동 목록
                </label>
                <textarea
                  id="about-activities"
                  rows="6"
                  maxLength={ABOUT_CONTENT_ITEM_LIMIT * ABOUT_CONTENT_LIST_LIMIT}
                  value={formValues.activities}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      activities: event.target.value,
                    }))
                  }
                ></textarea>
                <p className="schedule-field-hint">
                  한 줄에 한 항목씩 입력하면 목록으로 표시됩니다. 최대 {ABOUT_CONTENT_LIST_LIMIT}개까지
                  저장됩니다.
                </p>

                <label className="guestbook-label" htmlFor="about-website-title">
                  홈페이지 섹션 제목
                </label>
                <input
                  id="about-website-title"
                  type="text"
                  maxLength={ABOUT_CONTENT_TITLE_LIMIT}
                  value={formValues.websiteTitle}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      websiteTitle: event.target.value,
                    }))
                  }
                />

                <label className="guestbook-label" htmlFor="about-website-items">
                  홈페이지 목록
                </label>
                <textarea
                  id="about-website-items"
                  rows="6"
                  maxLength={ABOUT_CONTENT_ITEM_LIMIT * ABOUT_CONTENT_LIST_LIMIT}
                  value={formValues.websiteItems}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      websiteItems: event.target.value,
                    }))
                  }
                ></textarea>
                <p className="schedule-field-hint">
                  빈 줄은 저장되지 않으며, 저장 후 바로 페이지 내용에 반영됩니다.
                </p>

                <div className="schedule-form-actions">
                  <button type="submit" className="btn btn-dark" disabled={isSubmitting}>
                    {isSubmitting ? "저장 중.." : "소개 저장"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-light"
                    disabled={isSubmitting}
                    onClick={() => {
                      setFormValues(toFormValues(content));
                      setFormStatus(null);
                    }}
                  >
                    변경 취소
                  </button>
                </div>

                {formStatus ? (
                  <p className={`guestbook-status is-${formStatus.type}`}>{formStatus.text}</p>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default About;
