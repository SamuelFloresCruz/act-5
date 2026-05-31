import * as contactModel from "../models/contactModel";

export async function loadContactContent() {
  const [faqs, guides, info] = await Promise.all([
    contactModel.getFaqs(),
    contactModel.getGuides(),
    contactModel.getContactInfo(),
  ]);
  return { faqs, guides, info };
}
