import os
from copy import deepcopy

from bson import ObjectId

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "solveconnect_test")
os.environ.setdefault("SECRET_KEY", "test-secret")

class FakeInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class FakeCursor:
    def __init__(self, documents):
        self.documents = [deepcopy(document) for document in documents]

    def sort(self, field, direction):
        reverse = direction == -1
        self.documents.sort(key=lambda document: document.get(field), reverse=reverse)
        return self

    async def to_list(self, limit):
        if limit is None:
            return [deepcopy(document) for document in self.documents]
        return [deepcopy(document) for document in self.documents[:limit]]


def matches_query(document, query):
    for key, value in query.items():
        if key == "$or":
            return any(matches_query(document, clause) for clause in value)

        if isinstance(value, dict) and "$in" in value:
            if document.get(key) not in value["$in"]:
                return False
            continue

        if document.get(key) != value:
            return False

    return True


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = [deepcopy(document) for document in (documents or [])]

    async def insert_one(self, document):
        next_document = deepcopy(document)
        if "_id" not in next_document:
            next_document["_id"] = ObjectId()
        self.documents.append(next_document)
        return FakeInsertResult(next_document["_id"])

    async def find_one(self, query, sort=None):
        documents = [document for document in self.documents if matches_query(document, query)]
        if sort:
            field, direction = sort[0]
            documents.sort(key=lambda document: document.get(field), reverse=direction == -1)
        if not documents:
            return None
        return deepcopy(documents[0])

    async def update_one(self, query, update):
        for document in self.documents:
            if matches_query(document, query):
                for key, value in update.get("$set", {}).items():
                    document[key] = value
                break

    async def delete_one(self, query):
        for index, document in enumerate(self.documents):
            if matches_query(document, query):
                del self.documents[index]
                break

    async def count_documents(self, query):
        return sum(1 for document in self.documents if matches_query(document, query))

    def find(self, query, projection=None):
        documents = [document for document in self.documents if matches_query(document, query)]

        if projection:
            projected_documents = []
            for document in documents:
                if 0 in projection.values():
                    projected_document = deepcopy(document)
                    for key, include in projection.items():
                        if include == 0:
                            projected_document.pop(key, None)
                else:
                    projected_document = {"_id": document["_id"]}
                    for key, include in projection.items():
                        if include == 1 and key in document:
                            projected_document[key] = document[key]
                projected_documents.append(projected_document)
            documents = projected_documents

        return FakeCursor(documents)


class FakeDB:
    def __init__(self):
        buyer_id = ObjectId()
        helper_id = ObjectId()
        self.buyer_id = buyer_id
        self.helper_id = helper_id
        self.users = FakeCollection([
            {
                "_id": buyer_id,
                "name": "Buyer",
                "role": "need_help",
                "email": "buyer@example.com",
            },
            {
                "_id": helper_id,
                "name": "Helper",
                "role": "helper",
                "email": "helper@example.com",
            },
        ])
        self.jobs = FakeCollection()
        self.ad_payments = FakeCollection()
        self.notifications = FakeCollection()
        self.messages = FakeCollection()
        self.reviews = FakeCollection()
