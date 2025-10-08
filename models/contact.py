from sqlalchemy import Column, Integer, ForeignKey, Table
from core.database import Base

# Association Table for the many-to-many relationship between users (contacts)
user_contacts = Table('user_contacts', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('contact_user_id', Integer, ForeignKey('users.id'), primary_key=True)
)