from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from .contact import user_contacts

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    public_key = Column(String, nullable=False)
    contact_id = Column(String, unique=True, index=True, nullable=False)
    profile_picture_path = Column(String, nullable=True)

    contacts = relationship(
        "User",
        secondary=user_contacts,
        primaryjoin=id == user_contacts.c.user_id,
        secondaryjoin=id == user_contacts.c.contact_user_id,
        backref="contact_of"
    )